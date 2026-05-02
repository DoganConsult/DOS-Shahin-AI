/**
 * Scheduled-Jobs-Runner (W74) — per-tenant job catalog + execution journal.
 *
 * Definitions (`<tenant_schema>.scheduled_jobs`) are caller-registered with a
 * stable `job_code`, `interval_seconds`, optional `last_run_at` cursor and
 * `enabled` flag. The runner picks jobs whose (last_run_at + interval) is in
 * the past (or null), invokes a host-supplied handler keyed by job_code, and
 * journals each run to `<tenant_schema>.scheduled_job_runs` with status enum
 * `succeeded | failed | skipped` and duration_ms.
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic — no global
 * scheduler. Hosts cron the POST /run endpoint.
 */
import type { DbClient } from '../../db/runner';

export type ScheduledJobRunStatus = 'succeeded' | 'failed' | 'skipped';
const RUN_STATUSES: ReadonlyArray<ScheduledJobRunStatus> = [
  'succeeded', 'failed', 'skipped',
];

export interface ScheduledJobRow {
  jobCode: string;
  intervalSeconds: number;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: ScheduledJobRunStatus | null;
  createdAt: string;
  createdBy: string;
}

export interface ScheduledJobRunRow {
  runId: string;
  jobCode: string;
  startedAt: string;
  finishedAt: string | null;
  status: ScheduledJobRunStatus;
  durationMs: number;
  error: string | null;
  triggeredBy: string;
}

export interface UpsertJobInput {
  tenantSchema: string;
  actorId: string;
  jobCode: string;
  intervalSeconds: number;
  enabled?: boolean;
}

export interface ListJobsInput {
  tenantSchema: string;
  enabled?: boolean;
  limit?: number;
}

export interface ListJobRunsInput {
  tenantSchema: string;
  jobCode?: string;
  status?: ScheduledJobRunStatus;
  limit?: number;
  offset?: number;
}

export interface RunDueInput {
  tenantSchema: string;
  actorId: string;
  /** Restrict run to one job. */
  jobCode?: string;
  /** Injectable clock for tests. */
  now?: () => Date;
  /** Per-job handler. Throwing → status=failed; returning → succeeded. */
  handlers?: Record<string, (job: ScheduledJobRow) => Promise<void> | void>;
}

export interface RunDueResult {
  scanned: number;
  succeeded: number;
  failed: number;
  skipped: number;
  rows: ScheduledJobRunRow[];
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const JOB_COLS = `job_code, interval_seconds, enabled, last_run_at,
                  last_status, created_at, created_by`;
const RUN_COLS = `run_id, job_code, started_at, finished_at, status,
                  duration_ms, error, triggered_by`;

const mapJob = (x: {
  job_code: string; interval_seconds: string | number; enabled: boolean;
  last_run_at: string | null; last_status: string | null;
  created_at: string; created_by: string;
}): ScheduledJobRow => ({
  jobCode: x.job_code, intervalSeconds: Number(x.interval_seconds),
  enabled: !!x.enabled, lastRunAt: x.last_run_at,
  lastStatus: (x.last_status as ScheduledJobRunStatus | null) ?? null,
  createdAt: x.created_at, createdBy: x.created_by,
});

const mapRun = (x: {
  run_id: string; job_code: string; started_at: string;
  finished_at: string | null; status: string;
  duration_ms: string | number; error: string | null; triggered_by: string;
}): ScheduledJobRunRow => ({
  runId: x.run_id, jobCode: x.job_code, startedAt: x.started_at,
  finishedAt: x.finished_at, status: x.status as ScheduledJobRunStatus,
  durationMs: Number(x.duration_ms), error: x.error,
  triggeredBy: x.triggered_by,
});

export async function upsertJob(
  client: DbClient, input: UpsertJobInput,
): Promise<ScheduledJobRow> {
  assertSchema(input.tenantSchema);
  if (!input.jobCode) {
    throw Object.assign(new Error('jobCode required'), { code: 'bad_input' });
  }
  if (!Number.isFinite(input.intervalSeconds) || input.intervalSeconds <= 0) {
    throw Object.assign(
      new Error(`intervalSeconds ${input.intervalSeconds} must be > 0`),
      { code: 'bad_input' },
    );
  }
  const enabled = input.enabled ?? true;
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".scheduled_jobs
       (job_code, interval_seconds, enabled, last_run_at, last_status,
        created_by)
     VALUES ($1, $2, $3, NULL, NULL, $4)
     ON CONFLICT (job_code) DO UPDATE
        SET interval_seconds = EXCLUDED.interval_seconds,
            enabled = EXCLUDED.enabled
     RETURNING ${JOB_COLS}`,
    [input.jobCode, input.intervalSeconds, enabled, input.actorId],
  );
  return mapJob(r.rows[0] as never);
}

export async function getJob(
  client: DbClient,
  input: { tenantSchema: string; jobCode: string },
): Promise<ScheduledJobRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${JOB_COLS} FROM "${input.tenantSchema}".scheduled_jobs
      WHERE job_code = $1`,
    [input.jobCode],
  );
  return r.rowCount === 0 ? null : mapJob(r.rows[0] as never);
}

export async function listJobs(
  client: DbClient, input: ListJobsInput,
): Promise<{ rows: ScheduledJobRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.enabled !== undefined) {
    params.push(input.enabled); where += ` AND enabled = $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${JOB_COLS} FROM "${input.tenantSchema}".scheduled_jobs
      WHERE ${where} ORDER BY job_code LIMIT ${limit}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".scheduled_jobs WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapJob as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function listJobRuns(
  client: DbClient, input: ListJobRunsInput,
): Promise<{ rows: ScheduledJobRunRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.jobCode) { params.push(input.jobCode); where += ` AND job_code = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const r = await client.query(
    `SELECT ${RUN_COLS} FROM "${input.tenantSchema}".scheduled_job_runs
      WHERE ${where} ORDER BY started_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".scheduled_job_runs WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRun as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export function isDue(job: ScheduledJobRow, now: Date): boolean {
  if (!job.enabled) return false;
  if (!job.lastRunAt) return true;
  const last = Date.parse(job.lastRunAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= job.intervalSeconds * 1_000;
}

async function recordRun(
  client: DbClient, tenantSchema: string,
  jobCode: string, status: ScheduledJobRunStatus,
  durationMs: number, error: string | null, actorId: string,
): Promise<ScheduledJobRunRow> {
  const r = await client.query(
    `INSERT INTO "${tenantSchema}".scheduled_job_runs
       (job_code, started_at, finished_at, status, duration_ms,
        error, triggered_by)
     VALUES ($1, NOW(), NOW(), $2, $3, $4, $5)
     RETURNING ${RUN_COLS}`,
    [jobCode, status, durationMs, error, actorId],
  );
  return mapRun(r.rows[0] as never);
}

async function stampJob(
  client: DbClient, tenantSchema: string, jobCode: string,
  status: ScheduledJobRunStatus,
): Promise<void> {
  await client.query(
    `UPDATE "${tenantSchema}".scheduled_jobs
        SET last_run_at = NOW(), last_status = $2
      WHERE job_code = $1`,
    [jobCode, status],
  );
}

export async function runDue(
  client: DbClient, input: RunDueInput,
): Promise<RunDueResult> {
  assertSchema(input.tenantSchema);
  const now = input.now ? input.now() : new Date();
  const params: unknown[] = [true];
  let where = `enabled = $1`;
  if (input.jobCode) { params.push(input.jobCode); where += ` AND job_code = $${params.length}`; }
  const list = await client.query(
    `SELECT ${JOB_COLS} FROM "${input.tenantSchema}".scheduled_jobs
      WHERE ${where} ORDER BY job_code`,
    params,
  );
  const jobs = list.rows.map(mapJob as never) as ScheduledJobRow[];
  let succeeded = 0; let failed = 0; let skipped = 0;
  const out: ScheduledJobRunRow[] = [];
  for (const job of jobs) {
    if (!isDue(job, now)) continue;
    const handler = input.handlers?.[job.jobCode];
    const t0 = Date.now();
    if (!handler) {
      const dur = Date.now() - t0;
      const run = await recordRun(
        client, input.tenantSchema, job.jobCode, 'skipped',
        dur, 'no handler registered', input.actorId,
      );
      await stampJob(client, input.tenantSchema, job.jobCode, 'skipped');
      out.push(run); skipped++;
      continue;
    }
    try {
      await handler(job);
      const dur = Date.now() - t0;
      const run = await recordRun(
        client, input.tenantSchema, job.jobCode, 'succeeded',
        dur, null, input.actorId,
      );
      await stampJob(client, input.tenantSchema, job.jobCode, 'succeeded');
      out.push(run); succeeded++;
    } catch (e) {
      const dur = Date.now() - t0;
      const run = await recordRun(
        client, input.tenantSchema, job.jobCode, 'failed',
        dur, String((e as Error).message ?? e), input.actorId,
      );
      await stampJob(client, input.tenantSchema, job.jobCode, 'failed');
      out.push(run); failed++;
    }
  }
  if (!RUN_STATUSES.includes('succeeded')) {
    throw Object.assign(new Error('bad status'), { code: 'bad_status' });
  }
  return { scanned: jobs.length, succeeded, failed, skipped, rows: out };
}

export const SCHEDULED_JOB_RUN_STATUSES = RUN_STATUSES;
