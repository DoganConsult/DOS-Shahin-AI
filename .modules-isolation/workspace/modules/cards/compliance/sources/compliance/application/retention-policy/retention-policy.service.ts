/**
 * Retention-Policy (W68) — schedule-driven purge of expired records per
 * tenant. Reads retention rules from `<tenant_schema>.retention_policies`
 * (entity_type, retain_days, hard_delete, status) and journals each run
 * to `<tenant_schema>.retention_runs` with per-entity scanned/purged/
 * archived counters.
 *
 * Mode enum (per rule):
 *   soft  → UPDATE <entity table> SET status='retention_archived',
 *           retention_archived_at=NOW() WHERE created_at < cutoff
 *   hard  → DELETE FROM <entity table> WHERE created_at < cutoff
 *
 * Status enum (run): completed | failed | partial
 *
 * Supported entity_type → table mapping is closed-set (audit_events,
 * evidence_files, report_snapshots, change_log, retry_decisions,
 * outbox_dispatcher_runs, event_dead_letter). Unknown entity_type → skipped
 * with reason.
 */
import type { DbClient } from '../../db/runner';

export type RetentionRunStatus = 'completed' | 'failed' | 'partial';
const RUN_STATUSES: ReadonlyArray<RetentionRunStatus> = ['completed', 'failed', 'partial'];

export type RetentionMode = 'soft' | 'hard';
const MODES: ReadonlyArray<RetentionMode> = ['soft', 'hard'];

export interface RetentionPolicyRule {
  policyId: string;
  entityType: string;
  retainDays: number;
  hardDelete: boolean;
  enabled: boolean;
}

export interface RetentionEntityResult {
  entityType: string;
  policyId: string | null;
  retainDays: number | null;
  cutoffIso: string | null;
  scanned: number;
  purged: number;
  archived: number;
  skipped: boolean;
  reason: string | null;
}

export interface RetentionRunRow {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  status: RetentionRunStatus;
  totalScanned: number;
  totalPurged: number;
  totalArchived: number;
  details: RetentionEntityResult[];
  triggeredBy: string;
}

export interface RunRetentionInput {
  tenantSchema: string;
  actorId: string;
  /** Restrict to a subset of entity types; default = all enabled rules. */
  entityTypes?: string[];
  /** Force-skip the actual purge — preview only (counts but no writes). */
  dryRun?: boolean;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface ListRunsInput {
  tenantSchema: string;
  status?: RetentionRunStatus;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

/** Closed-set mapping of supported retention targets. */
const ENTITY_TABLE: Record<string, string> = {
  audit_events: 'audit_events',
  evidence_files: 'evidence_files',
  report_snapshots: 'report_snapshots',
  change_log: 'change_log',
  retry_decisions: 'retry_decisions',
  outbox_dispatcher_runs: 'outbox_dispatcher_runs',
  event_dead_letter: 'event_dead_letter',
};

const RUN_COLS = `run_id, started_at, finished_at, status, total_scanned,
                  total_purged, total_archived, details, triggered_by`;

const mapRun = (x: {
  run_id: string; started_at: string; finished_at: string | null;
  status: string; total_scanned: string | number;
  total_purged: string | number; total_archived: string | number;
  details: RetentionEntityResult[] | null; triggered_by: string;
}): RetentionRunRow => ({
  runId: x.run_id, startedAt: x.started_at, finishedAt: x.finished_at,
  status: x.status as RetentionRunStatus,
  totalScanned: Number(x.total_scanned), totalPurged: Number(x.total_purged),
  totalArchived: Number(x.total_archived),
  details: x.details ?? [], triggeredBy: x.triggered_by,
});

export function isSupportedEntityType(t: string): boolean {
  return Object.prototype.hasOwnProperty.call(ENTITY_TABLE, t);
}

export const RETENTION_SUPPORTED_ENTITIES = Object.freeze(Object.keys(ENTITY_TABLE));

async function loadRules(
  client: DbClient,
  tenantSchema: string,
): Promise<RetentionPolicyRule[]> {
  const r = await client.query<{
    policy_id: string; entity_type: string;
    retain_days: string | number; hard_delete: boolean;
    enabled: boolean;
  }>(
    `SELECT policy_id, entity_type, retain_days, hard_delete, enabled
       FROM "${tenantSchema}".retention_policies
      WHERE enabled = true`,
    [],
  );
  return r.rows.map((x) => ({
    policyId: x.policy_id, entityType: x.entity_type,
    retainDays: Number(x.retain_days), hardDelete: !!x.hard_delete,
    enabled: !!x.enabled,
  }));
}

async function scanCount(
  client: DbClient, tenantSchema: string, table: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${tenantSchema}"."${table}"
      WHERE created_at < $1`,
    [cutoffIso],
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function applyHard(
  client: DbClient, tenantSchema: string, table: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query(
    `DELETE FROM "${tenantSchema}"."${table}" WHERE created_at < $1`,
    [cutoffIso],
  );
  return r.rowCount ?? 0;
}

async function applySoft(
  client: DbClient, tenantSchema: string, table: string, cutoffIso: string,
): Promise<number> {
  const r = await client.query(
    `UPDATE "${tenantSchema}"."${table}"
        SET status = 'retention_archived', retention_archived_at = NOW()
      WHERE created_at < $1
        AND COALESCE(status,'') <> 'retention_archived'`,
    [cutoffIso],
  );
  return r.rowCount ?? 0;
}

export async function planEntity(
  client: DbClient,
  input: {
    tenantSchema: string; rule: RetentionPolicyRule;
    dryRun: boolean; now: Date;
  },
): Promise<RetentionEntityResult> {
  const { tenantSchema, rule, dryRun, now } = input;
  if (!isSupportedEntityType(rule.entityType)) {
    return {
      entityType: rule.entityType, policyId: rule.policyId,
      retainDays: rule.retainDays, cutoffIso: null,
      scanned: 0, purged: 0, archived: 0, skipped: true,
      reason: `unsupported entity_type ${rule.entityType}`,
    };
  }
  if (rule.retainDays <= 0) {
    return {
      entityType: rule.entityType, policyId: rule.policyId,
      retainDays: rule.retainDays, cutoffIso: null,
      scanned: 0, purged: 0, archived: 0, skipped: true,
      reason: `retain_days ${rule.retainDays} must be > 0`,
    };
  }
  const cutoff = new Date(now.getTime() - rule.retainDays * 86_400_000);
  const cutoffIso = cutoff.toISOString();
  const table = ENTITY_TABLE[rule.entityType];
  const scanned = await scanCount(client, tenantSchema, table, cutoffIso);
  if (dryRun || scanned === 0) {
    return {
      entityType: rule.entityType, policyId: rule.policyId,
      retainDays: rule.retainDays, cutoffIso,
      scanned, purged: 0, archived: 0, skipped: false, reason: null,
    };
  }
  let purged = 0; let archived = 0;
  if (rule.hardDelete) {
    purged = await applyHard(client, tenantSchema, table, cutoffIso);
  } else {
    archived = await applySoft(client, tenantSchema, table, cutoffIso);
  }
  return {
    entityType: rule.entityType, policyId: rule.policyId,
    retainDays: rule.retainDays, cutoffIso,
    scanned, purged, archived, skipped: false, reason: null,
  };
}

export async function runRetention(
  client: DbClient,
  input: RunRetentionInput,
): Promise<RetentionRunRow> {
  assertSchema(input.tenantSchema);
  const now = (input.now ? input.now() : new Date());
  const dryRun = !!input.dryRun;

  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".retention_runs
       (started_at, status, total_scanned, total_purged, total_archived,
        details, triggered_by)
     VALUES (NOW(), 'partial', 0, 0, 0, '[]'::jsonb, $1)
     RETURNING ${RUN_COLS}`,
    [input.actorId],
  );
  let run = mapRun(ins.rows[0] as never);

  const allRules = await loadRules(client, input.tenantSchema);
  const filter = input.entityTypes && input.entityTypes.length > 0
    ? new Set(input.entityTypes) : null;
  const rules = filter ? allRules.filter((r) => filter.has(r.entityType)) : allRules;

  const details: RetentionEntityResult[] = [];
  let totalScanned = 0; let totalPurged = 0; let totalArchived = 0;
  let anyFailed = false;

  for (const rule of rules) {
    try {
      const r = await planEntity(client, {
        tenantSchema: input.tenantSchema, rule, dryRun, now,
      });
      details.push(r);
      totalScanned += r.scanned; totalPurged += r.purged; totalArchived += r.archived;
    } catch (e) {
      anyFailed = true;
      details.push({
        entityType: rule.entityType, policyId: rule.policyId,
        retainDays: rule.retainDays, cutoffIso: null,
        scanned: 0, purged: 0, archived: 0, skipped: true,
        reason: `error: ${(e as Error).message}`,
      });
    }
  }

  const status: RetentionRunStatus = anyFailed
    ? (details.some((d) => !d.skipped && (d.purged > 0 || d.archived > 0)) ? 'partial' : 'failed')
    : 'completed';

  if (!RUN_STATUSES.includes(status)) {
    throw Object.assign(new Error(`bad status ${status}`), { code: 'bad_status' });
  }

  const upd = await client.query(
    `UPDATE "${input.tenantSchema}".retention_runs
        SET finished_at = NOW(), status = $2,
            total_scanned = $3, total_purged = $4, total_archived = $5,
            details = $6::jsonb
      WHERE run_id = $1
      RETURNING ${RUN_COLS}`,
    [run.runId, status, totalScanned, totalPurged, totalArchived,
     JSON.stringify(details)],
  );
  run = mapRun(upd.rows[0] as never);
  return run;
}

export async function listRetentionRuns(
  client: DbClient,
  input: ListRunsInput,
): Promise<{ rows: RetentionRunRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const r = await client.query(
    `SELECT ${RUN_COLS} FROM "${input.tenantSchema}".retention_runs
      WHERE ${where} ORDER BY started_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".retention_runs WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRun as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export const RETENTION_RUN_STATUSES = RUN_STATUSES;
export const RETENTION_MODES = MODES;
