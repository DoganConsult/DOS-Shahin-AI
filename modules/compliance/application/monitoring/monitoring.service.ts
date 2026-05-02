/**
 * Monitoring service — tenant-scoped CRUD over `<tenant_schema>.compliance_monitoring`.
 *
 * status enum: 'active' | 'paused' | 'failed' | 'retired'
 * Default 'active' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type MonitoringStatus = 'active' | 'paused' | 'failed' | 'retired';

export interface MonitoringRow {
  id: string;
  tenantId: string;
  requirementId: string;
  monitoringType: string;
  frequency: string | null;
  lastChecked: string | null;
  nextCheck: string | null;
  status: MonitoringStatus;
  automated: boolean;
  alertThreshold: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListMonitoringInput {
  tenantSchema: string;
  tenantId: string;
  requirementId?: string;
  monitoringType?: string;
  status?: MonitoringStatus;
  automated?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateMonitoringInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  requirementId: string;
  monitoringType: string;
  frequency?: string | null;
  lastChecked?: string | null;
  nextCheck?: string | null;
  status?: MonitoringStatus;
  automated?: boolean;
  alertThreshold?: Record<string, unknown>;
}

export interface RecordMonitoringCheckInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  /** When provided, ISO timestamp; otherwise NOW(). */
  checkedAt?: string;
  /** Optional ISO timestamp for next scheduled check. */
  nextCheck?: string | null;
  /** Optional status transition (e.g., 'failed' if check failed). */
  status?: MonitoringStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<MonitoringStatus> = new Set([
  'active', 'paused', 'failed', 'retired',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is MonitoringStatus {
  if (!STATUSES.has(s as MonitoringStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, requirement_id, monitoring_type, frequency,
              last_checked, next_check, status, automated, alert_threshold,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; requirement_id: string;
  monitoring_type: string; frequency: string | null;
  last_checked: string | null; next_check: string | null;
  status: MonitoringStatus; automated: boolean;
  alert_threshold: Record<string, unknown>;
  created_at: string; updated_at: string;
}): MonitoringRow => ({
  id: x.id, tenantId: x.tenant_id, requirementId: x.requirement_id,
  monitoringType: x.monitoring_type, frequency: x.frequency,
  lastChecked: x.last_checked, nextCheck: x.next_check,
  status: x.status, automated: x.automated,
  alertThreshold: x.alert_threshold ?? {},
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listMonitoring(
  client: DbClient,
  input: ListMonitoringInput,
): Promise<{ rows: MonitoringRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.monitoringType) { params.push(input.monitoringType); where += ` AND monitoring_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (typeof input.automated === 'boolean') { params.push(input.automated); where += ` AND automated = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_monitoring
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_monitoring WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getMonitoring(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<MonitoringRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_monitoring
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createMonitoring(
  client: DbClient,
  input: CreateMonitoringInput,
): Promise<MonitoringRow> {
  assertSchema(input.tenantSchema);
  if (!input.requirementId || !input.monitoringType) {
    throw Object.assign(new Error('requirementId and monitoringType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_monitoring
       (tenant_id, requirement_id, monitoring_type, frequency,
        last_checked, next_check, status, automated, alert_threshold)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.requirementId, input.monitoringType,
      input.frequency ?? null, input.lastChecked ?? null,
      input.nextCheck ?? null, input.status ?? 'active',
      input.automated ?? false,
      JSON.stringify(input.alertThreshold ?? {}),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function recordMonitoringCheck(
  client: DbClient,
  input: RecordMonitoringCheckInput,
): Promise<MonitoringRow | null> {
  assertSchema(input.tenantSchema);
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_monitoring
        SET last_checked = COALESCE($3::timestamptz, NOW()),
            next_check = COALESCE($4::timestamptz, next_check),
            status = COALESCE($5, status),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [
      input.tenantId, input.id,
      input.checkedAt ?? null, input.nextCheck ?? null,
      input.status ?? null,
    ],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
