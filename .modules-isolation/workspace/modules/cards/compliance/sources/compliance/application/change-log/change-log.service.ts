/**
 * Change-Log service — tenant-scoped append-only field-change log
 * over `<tenant_schema>.compliance_change_log`.
 *
 * Append-only: list/get/record. No update/delete (audit-grade immutability).
 */
import type { DbClient } from '../../db/runner';

export interface ChangeLogRow {
  id: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListChangeLogInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  fieldName?: string;
  changedBy?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface RecordChangeInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  correlationId?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_id, entity_type, field_name, old_value, new_value,
              changed_by, changed_at, correlation_id, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_id: string; entity_type: string;
  field_name: string; old_value: string | null; new_value: string | null;
  changed_by: string; changed_at: string; correlation_id: string | null;
  created_at: string; updated_at: string;
}): ChangeLogRow => ({
  id: x.id, tenantId: x.tenant_id, entityId: x.entity_id, entityType: x.entity_type,
  fieldName: x.field_name, oldValue: x.old_value, newValue: x.new_value,
  changedBy: x.changed_by, changedAt: x.changed_at, correlationId: x.correlation_id,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listChangeLog(
  client: DbClient,
  input: ListChangeLogInput,
): Promise<{ rows: ChangeLogRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.fieldName) { params.push(input.fieldName); where += ` AND field_name = $${params.length}`; }
  if (input.changedBy) { params.push(input.changedBy); where += ` AND changed_by = $${params.length}`; }
  if (input.correlationId) { params.push(input.correlationId); where += ` AND correlation_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_change_log
     WHERE ${where} ORDER BY changed_at DESC, id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_change_log WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getChangeLog(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ChangeLogRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_change_log
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function recordChange(
  client: DbClient,
  input: RecordChangeInput,
): Promise<ChangeLogRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.fieldName) {
    throw Object.assign(
      new Error('entityType, entityId, fieldName required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_change_log
       (tenant_id, entity_id, entity_type, field_name, old_value, new_value, changed_by, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityId, input.entityType, input.fieldName,
      input.oldValue ?? null, input.newValue ?? null, input.actorId,
      input.correlationId ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}
