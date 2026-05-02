/**
 * DOS scheduled-job runner.
 *
 * Polls platform_dos.scheduled_jobs every intervalMs for rows whose
 * cron_expression would have elapsed since last_triggered_at. Each due
 * row's handler (looked up by job name from an in-process map) is
 * invoked, and the row's last_triggered_at + trigger_count are bumped.
 *
 * This implementation uses a minimal "seconds-granular" cron evaluator
 * (standard 5-field cron: `m h dom mon dow`). It's deliberately small
 * — a full cron library is overkill for the orchestrator's own schedule,
 * and bringing one in would pull runtime deps DOS doesn't otherwise need.
 */

import type { DOSPort } from '@dos/ports/dos';

export interface ScheduledJobRow {
  readonly jobId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly cronExpression: string;
  readonly status: 'active' | 'paused' | 'completed' | 'failed';
  readonly lastTriggeredAt: Date | null;
}

export interface ScheduledJobsRepository {
  listDue(now: Date, evaluate: (row: ScheduledJobRow, now: Date) => boolean): Promise<readonly ScheduledJobRow[]>;
  markTriggered(jobId: string, triggeredBy: string, at: Date): Promise<void>;
  markFailed(jobId: string, error: string): Promise<void>;
}

export class InMemoryScheduledJobsRepository implements ScheduledJobsRepository {
  private rows: ScheduledJobRow[] = [];

  async insertForTest(row: ScheduledJobRow): Promise<void> {
    this.rows.push({ ...row });
  }

  async listDue(
    now: Date,
    evaluate: (row: ScheduledJobRow, now: Date) => boolean,
  ): Promise<readonly ScheduledJobRow[]> {
    return this.rows.filter((r) => r.status === 'active' && evaluate(r, now));
  }

  async markTriggered(jobId: string, triggeredBy: string, at: Date): Promise<void> {
    const idx = this.rows.findIndex((r) => r.jobId === jobId);
    if (idx === -1) return;
    this.rows[idx] = { ...this.rows[idx], lastTriggeredAt: at };
    void triggeredBy;
  }

  async markFailed(jobId: string, _error: string): Promise<void> {
    const idx = this.rows.findIndex((r) => r.jobId === jobId);
    if (idx === -1) return;
    this.rows[idx] = { ...this.rows[idx], status: 'failed' };
  }
}

export class PgScheduledJobsRepository implements ScheduledJobsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}

  async listDue(
    now: Date,
    evaluate: (row: ScheduledJobRow, now: Date) => boolean,
  ): Promise<readonly ScheduledJobRow[]> {
    const { rows } = await this.query(
      `SELECT job_id, tenant_id, name, cron_expression, status, last_triggered_at
         FROM platform_dos.scheduled_jobs
         WHERE status = 'active'`,
      [],
    );
    const mapped: ScheduledJobRow[] = rows.map((r) => ({
      jobId: r.job_id,
      tenantId: r.tenant_id,
      name: r.name,
      cronExpression: r.cron_expression,
      status: r.status,
      lastTriggeredAt: r.last_triggered_at instanceof Date ? r.last_triggered_at : r.last_triggered_at ? new Date(r.last_triggered_at) : null,
    }));
    return mapped.filter((r) => evaluate(r, now));
  }

  async markTriggered(jobId: string, triggeredBy: string, at: Date): Promise<void> {
    await this.query(
      `UPDATE platform_dos.scheduled_jobs
         SET last_triggered_at = $2,
             last_triggered_by = $3,
             trigger_count = trigger_count + 1
         WHERE job_id = $1`,
      [jobId, at.toISOString(), triggeredBy],
    );
  }

  async markFailed(jobId: string, _error: string): Promise<void> {
    await this.query(
      `UPDATE platform_dos.scheduled_jobs SET status = 'failed' WHERE job_id = $1`,
      [jobId],
    );
  }
}

// ──────────────── Cron evaluator (5-field) ────────────────

// Returns true if `now` matches the 5-field cron expression `m h dom mon dow`.
// Supports: star (every), star-slash-n (step), a,b,c (list), a-b (range), and
// single numeric values. DOM + DOW restrictions are AND-combined (classic cron).
export function cronMatches(expr: string, now: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const dom = now.getUTCDate();
  const mon = now.getUTCMonth() + 1;
  const dow = now.getUTCDay(); // 0..6
  return (
    matchField(fields[0], minute, 0, 59) &&
    matchField(fields[1], hour, 0, 23) &&
    matchField(fields[2], dom, 1, 31) &&
    matchField(fields[3], mon, 1, 12) &&
    matchField(fields[4], dow, 0, 6)
  );
}

function matchField(spec: string, value: number, min: number, max: number): boolean {
  for (const atom of spec.split(',')) {
    const stepMatch = atom.match(/^(\*|(\d+)-(\d+))\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[4], 10);
      if (step <= 0) return false;
      const lo = stepMatch[1] === '*' ? min : parseInt(stepMatch[2], 10);
      const hi = stepMatch[1] === '*' ? max : parseInt(stepMatch[3], 10);
      if (value < lo || value > hi) continue;
      if ((value - lo) % step === 0) return true;
      continue;
    }
    if (atom === '*') return true;
    const rangeMatch = atom.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1], 10);
      const hi = parseInt(rangeMatch[2], 10);
      if (value >= lo && value <= hi) return true;
      continue;
    }
    const n = parseInt(atom, 10);
    if (!Number.isNaN(n) && n === value) return true;
  }
  return false;
}

// ──────────────── Runner ────────────────

export type JobHandler = (row: ScheduledJobRow) => Promise<void>;

export interface SchedulerDeps {
  readonly repo: ScheduledJobsRepository;
  readonly port: DOSPort;
  readonly handlers: Map<string, JobHandler>;
  readonly triggeredBy?: string;
}

/** Run one tick — evaluate every active job row against `now` and fire due ones. */
export async function runSchedulerTick(deps: SchedulerDeps, now: Date = new Date()): Promise<{
  readonly evaluated: number;
  readonly fired: number;
  readonly failed: number;
}> {
  const triggeredBy = deps.triggeredBy ?? 'dos-scheduler';
  const due = await deps.repo.listDue(now, (row, at) => {
    // Debounce: if last_triggered_at is in the same minute as `now`, skip.
    if (row.lastTriggeredAt && sameMinute(row.lastTriggeredAt, at)) return false;
    return cronMatches(row.cronExpression, at);
  });

  let fired = 0;
  let failed = 0;

  for (const row of due) {
    const handler = deps.handlers.get(row.name);
    if (!handler) continue; // no registered handler — row is inert
    try {
      await handler(row);
      await deps.repo.markTriggered(row.jobId, triggeredBy, now);
      await deps.port
        .publishEvent({
          eventType: 'dos.job.completed',
          tenantId: row.tenantId,
          occurredAt: now.toISOString(),
          payload: { jobId: row.jobId, name: row.name },
        })
        .catch(() => {});
      fired++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await deps.repo.markFailed(row.jobId, message);
      await deps.port
        .publishEvent({
          eventType: 'dos.job.failed',
          tenantId: row.tenantId,
          occurredAt: now.toISOString(),
          payload: { jobId: row.jobId, name: row.name, error: message },
        })
        .catch(() => {});
    }
  }

  return { evaluated: due.length, fired, failed };
}

function sameMinute(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

/** Start a repeating tick. Returns a dispose function. intervalMs defaults to 60s. */
export function startSchedulerLoop(
  deps: SchedulerDeps,
  intervalMs: number = 60_000,
): () => void {
  const run = async () => {
    try {
      const r = await runSchedulerTick(deps);
      if (r.fired > 0 || r.failed > 0) {
        console.log(`[dos-scheduler] fired=${r.fired} failed=${r.failed} evaluated=${r.evaluated}`);
      }
    } catch (err) {
      console.error('[dos-scheduler] tick failed', err);
    }
  };
  const handle = setInterval(() => void run(), intervalMs);
  void run();
  return () => clearInterval(handle);
}
