/**
 * Outbox-Archive (W71) — copies `dispatched` rows from
 * `<tenant_schema>.event_outbox` older than `olderThanDays` into
 * `<tenant_schema>.event_outbox_archive` and deletes them from the live
 * outbox. Each run is journaled to `<tenant_schema>.event_outbox_archive_runs`
 * with scanned/archived/deleted counters.
 *
 * Status enum (run): completed | failed | partial
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic; clock is
 * injectable for tests.
 */
import type { DbClient } from '../../db/runner';

export type ArchiveRunStatus = 'completed' | 'failed' | 'partial';
const RUN_STATUSES: ReadonlyArray<ArchiveRunStatus> = ['completed', 'failed', 'partial'];

export interface ArchiveRunRow {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  status: ArchiveRunStatus;
  cutoffIso: string;
  scanned: number;
  archived: number;
  deleted: number;
  error: string | null;
  triggeredBy: string;
}

export interface RunArchiveInput {
  tenantSchema: string;
  actorId: string;
  /** Records older than this many days are archived. Default 30. */
  olderThanDays?: number;
  /** Force-skip the actual archive — preview only. */
  dryRun?: boolean;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface ListArchiveRunsInput {
  tenantSchema: string;
  status?: ArchiveRunStatus;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const RUN_COLS = `run_id, started_at, finished_at, status, cutoff_iso,
                  scanned, archived, deleted, error, triggered_by`;

const mapRun = (x: {
  run_id: string; started_at: string; finished_at: string | null;
  status: string; cutoff_iso: string;
  scanned: string | number; archived: string | number; deleted: string | number;
  error: string | null; triggered_by: string;
}): ArchiveRunRow => ({
  runId: x.run_id, startedAt: x.started_at, finishedAt: x.finished_at,
  status: x.status as ArchiveRunStatus, cutoffIso: x.cutoff_iso,
  scanned: Number(x.scanned), archived: Number(x.archived),
  deleted: Number(x.deleted), error: x.error, triggeredBy: x.triggered_by,
});

async function scanCount(
  client: DbClient, tenantSchema: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${tenantSchema}".event_outbox
      WHERE status = 'dispatched' AND created_at < $1`,
    [cutoffIso],
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function copyToArchive(
  client: DbClient, tenantSchema: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query(
    `INSERT INTO "${tenantSchema}".event_outbox_archive
       (event_id, event_type, aggregate_type, aggregate_id, payload,
        status, attempts, error_message, created_at, dispatched_at,
        archived_at)
     SELECT event_id, event_type, aggregate_type, aggregate_id, payload,
            status, attempts, error_message, created_at, dispatched_at,
            NOW()
       FROM "${tenantSchema}".event_outbox
      WHERE status = 'dispatched' AND created_at < $1
     ON CONFLICT (event_id) DO NOTHING`,
    [cutoffIso],
  );
  return r.rowCount ?? 0;
}

async function deleteFromOutbox(
  client: DbClient, tenantSchema: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query(
    `DELETE FROM "${tenantSchema}".event_outbox
      WHERE status = 'dispatched' AND created_at < $1`,
    [cutoffIso],
  );
  return r.rowCount ?? 0;
}

export async function runArchive(
  client: DbClient, input: RunArchiveInput,
): Promise<ArchiveRunRow> {
  assertSchema(input.tenantSchema);
  const olderThanDays = input.olderThanDays ?? 30;
  if (!Number.isFinite(olderThanDays) || olderThanDays <= 0) {
    throw Object.assign(
      new Error(`olderThanDays ${olderThanDays} must be > 0`),
      { code: 'bad_input' },
    );
  }
  const now = input.now ? input.now() : new Date();
  const cutoffIso = new Date(now.getTime() - olderThanDays * 86_400_000).toISOString();
  const dryRun = !!input.dryRun;

  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".event_outbox_archive_runs
       (started_at, status, cutoff_iso, scanned, archived, deleted,
        error, triggered_by)
     VALUES (NOW(), 'partial', $1, 0, 0, 0, NULL, $2)
     RETURNING ${RUN_COLS}`,
    [cutoffIso, input.actorId],
  );
  let run = mapRun(ins.rows[0] as never);

  let scanned = 0; let archived = 0; let deleted = 0;
  let status: ArchiveRunStatus = 'completed';
  let errMsg: string | null = null;
  try {
    scanned = await scanCount(client, input.tenantSchema, cutoffIso);
    if (!dryRun && scanned > 0) {
      archived = await copyToArchive(client, input.tenantSchema, cutoffIso);
      deleted = await deleteFromOutbox(client, input.tenantSchema, cutoffIso);
      if (deleted < archived) status = 'partial';
    }
  } catch (e) {
    status = 'failed';
    errMsg = String((e as Error).message ?? e);
  }
  if (!RUN_STATUSES.includes(status)) {
    throw Object.assign(new Error(`bad status ${status}`), { code: 'bad_status' });
  }

  const upd = await client.query(
    `UPDATE "${input.tenantSchema}".event_outbox_archive_runs
        SET finished_at = NOW(), status = $2,
            scanned = $3, archived = $4, deleted = $5, error = $6
      WHERE run_id = $1
      RETURNING ${RUN_COLS}`,
    [run.runId, status, scanned, archived, deleted, errMsg],
  );
  run = mapRun(upd.rows[0] as never);
  return run;
}

export async function listArchiveRuns(
  client: DbClient, input: ListArchiveRunsInput,
): Promise<{ rows: ArchiveRunRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const r = await client.query(
    `SELECT ${RUN_COLS} FROM "${input.tenantSchema}".event_outbox_archive_runs
      WHERE ${where} ORDER BY started_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".event_outbox_archive_runs WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRun as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export const ARCHIVE_RUN_STATUSES = RUN_STATUSES;
