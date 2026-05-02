/**
 * Versions service — tenant-scoped immutable entity-version snapshots
 * over `<tenant_schema>.compliance_versions`.
 *
 * Append-only: list/get/recordVersion/getLatest. Version number auto-increments
 * per (tenant_id, entity_type, entity_id).
 */
import type { DbClient } from '../../db/runner';

export interface VersionRow {
  id: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  version: number;
  data: Record<string, unknown>;
  changedBy: string;
  changedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListVersionsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  changedBy?: string;
  limit?: number;
  offset?: number;
}

export interface RecordVersionInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_id, entity_type, version, data,
              changed_by, changed_at, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_id: string; entity_type: string;
  version: string | number; data: Record<string, unknown>;
  changed_by: string; changed_at: string;
  created_at: string; updated_at: string;
}): VersionRow => ({
  id: x.id, tenantId: x.tenant_id, entityId: x.entity_id, entityType: x.entity_type,
  version: Number(x.version), data: x.data ?? {},
  changedBy: x.changed_by, changedAt: x.changed_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listVersions(
  client: DbClient,
  input: ListVersionsInput,
): Promise<{ rows: VersionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.changedBy) { params.push(input.changedBy); where += ` AND changed_by = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_versions
     WHERE ${where} ORDER BY entity_id ASC, version DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_versions WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getVersion(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<VersionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_versions
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function getLatestVersion(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; entityType: string; entityId: string },
): Promise<VersionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_versions
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY version DESC LIMIT 1`,
    [input.tenantId, input.entityType, input.entityId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function recordVersion(
  client: DbClient,
  input: RecordVersionInput,
): Promise<VersionRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId) {
    throw Object.assign(
      new Error('entityType, entityId required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_versions
       (tenant_id, entity_id, entity_type, version, data, changed_by)
     SELECT $1, $2, $3,
            COALESCE((SELECT MAX(version) + 1
                        FROM "${input.tenantSchema}".compliance_versions
                       WHERE tenant_id = $1 AND entity_type = $3 AND entity_id = $2), 1),
            $4::jsonb, $5
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityId, input.entityType,
      JSON.stringify(input.data ?? {}),
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}
