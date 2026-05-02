/**
 * Outbox-Dispatcher Job (W65) — long-lived scheduled drainer for the W60
 * `<tenant_schema>.event_outbox` table. Holds a single-tenant lock token,
 * polls at a configurable interval, and stamps a journal row in
 * `<tenant_schema>.outbox_dispatcher_runs` per cycle (rows scanned/dispatched/
 * failed, started/finished timestamps, status enum).
 *
 * Status enum: idle|running|stopped
 *
 * Designed to be embedded by hosts (single worker per tenant); no global
 * timer side effects unless explicitly started via `start()`.
 */
import type { DbClient } from '../../db/runner';
import {
  dispatchPendingEvents,
  type OutboxRow,
} from '../event-publisher/event-publisher.service';

export type DispatcherStatus = 'idle' | 'running' | 'stopped';

export interface DispatcherRun {
  runId: string;
  tenantSchema: string;
  startedAt: string;
  finishedAt: string | null;
  scanned: number;
  dispatched: number;
  failed: number;
  status: DispatcherStatus;
  lockToken: string;
}

export interface DispatcherJobOptions {
  client: DbClient;
  tenantSchema: string;
  intervalMs?: number;
  batch?: number;
  lockToken?: string;
  handler?: (row: OutboxRow) => Promise<void> | void;
  onError?: (e: unknown) => void;
}

export interface DispatcherJobHandle {
  start: () => void;
  stop: () => Promise<void>;
  runOnce: () => Promise<DispatcherRun>;
  status: () => DispatcherStatus;
  lastRun: () => DispatcherRun | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const RUN_COLS = `run_id, tenant_schema, started_at, finished_at, scanned,
                  dispatched, failed, status, lock_token`;

const mapRun = (x: {
  run_id: string; tenant_schema: string;
  started_at: string; finished_at: string | null;
  scanned: string | number; dispatched: string | number; failed: string | number;
  status: string; lock_token: string;
}): DispatcherRun => ({
  runId: x.run_id, tenantSchema: x.tenant_schema,
  startedAt: x.started_at, finishedAt: x.finished_at,
  scanned: Number(x.scanned), dispatched: Number(x.dispatched), failed: Number(x.failed),
  status: x.status as DispatcherStatus, lockToken: x.lock_token,
});

let tokenCounter = 0;
function defaultLockToken(): string {
  tokenCounter = (tokenCounter + 1) >>> 0;
  return `disp_${Date.now().toString(36)}_${tokenCounter.toString(36)}`;
}

export async function listRuns(
  client: DbClient,
  input: { tenantSchema: string; status?: DispatcherStatus; limit?: number },
): Promise<{ rows: DispatcherRun[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const params: unknown[] = [input.tenantSchema];
  let where = `tenant_schema = $1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const r = await client.query(
    `SELECT ${RUN_COLS} FROM "${input.tenantSchema}".outbox_dispatcher_runs
      WHERE ${where} ORDER BY started_at DESC LIMIT ${limit}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".outbox_dispatcher_runs WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRun as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function executeRun(
  opts: DispatcherJobOptions & { lockToken: string },
): Promise<DispatcherRun> {
  assertSchema(opts.tenantSchema);
  const ins = await opts.client.query(
    `INSERT INTO "${opts.tenantSchema}".outbox_dispatcher_runs
       (tenant_schema, started_at, scanned, dispatched, failed, status, lock_token)
     VALUES ($1, NOW(), 0, 0, 0, 'running', $2)
     RETURNING ${RUN_COLS}`,
    [opts.tenantSchema, opts.lockToken],
  );
  let run = mapRun(ins.rows[0] as never);
  try {
    const result = await dispatchPendingEvents(opts.client, {
      tenantSchema: opts.tenantSchema,
      batch: opts.batch,
      handler: opts.handler,
    });
    const upd = await opts.client.query(
      `UPDATE "${opts.tenantSchema}".outbox_dispatcher_runs
          SET finished_at = NOW(), scanned = $2, dispatched = $3, failed = $4, status = 'idle'
        WHERE run_id = $1
        RETURNING ${RUN_COLS}`,
      [run.runId, result.dispatched + result.failed, result.dispatched, result.failed],
    );
    run = mapRun(upd.rows[0] as never);
  } catch (e) {
    const upd = await opts.client.query(
      `UPDATE "${opts.tenantSchema}".outbox_dispatcher_runs
          SET finished_at = NOW(), status = 'stopped'
        WHERE run_id = $1
        RETURNING ${RUN_COLS}`,
      [run.runId],
    );
    if (upd.rowCount && upd.rowCount > 0) run = mapRun(upd.rows[0] as never);
    if (opts.onError) opts.onError(e);
    else throw e;
  }
  return run;
}

export function createDispatcherJob(opts: DispatcherJobOptions): DispatcherJobHandle {
  assertSchema(opts.tenantSchema);
  const interval = Math.max(opts.intervalMs ?? 5000, 100);
  const lockToken = opts.lockToken ?? defaultLockToken();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let _status: DispatcherStatus = 'idle';
  let _last: DispatcherRun | null = null;

  const tick = async (): Promise<void> => {
    if (_status === 'stopped') return;
    _status = 'running';
    try { _last = await executeRun({ ...opts, lockToken }); }
    catch (e) { if (opts.onError) opts.onError(e); }
    finally { if ((_status as DispatcherStatus) !== 'stopped') _status = 'idle'; }
    if ((_status as DispatcherStatus) !== 'stopped') {
      timer = setTimeout(() => { void tick(); }, interval);
    }
  };

  return {
    start(): void {
      if (timer || _status === 'stopped') return;
      timer = setTimeout(() => { void tick(); }, interval);
    },
    async stop(): Promise<void> {
      _status = 'stopped';
      if (timer) { clearTimeout(timer); timer = null; }
    },
    async runOnce(): Promise<DispatcherRun> {
      const run = await executeRun({ ...opts, lockToken });
      _last = run;
      return run;
    },
    status(): DispatcherStatus { return _status; },
    lastRun(): DispatcherRun | null { return _last; },
  };
}
