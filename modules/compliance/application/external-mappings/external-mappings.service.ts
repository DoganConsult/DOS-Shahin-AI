/**
 * External-Mappings service — tenant-scoped mappings between internal entities
 * and external systems (e.g., GRC tools, ticketing) over
 * `<tenant_schema>.compliance_external_mappings`.
 *
 * CRUD + recordSync (PATCH /sync) which stamps last_synced_at + sync_status.
 */
import type { DbClient } from '../../db/runner';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'stale' | 'disconnected';
const SYNC_STATUSES: ReadonlyArray<SyncStatus> = ['synced', 'pending', 'error', 'stale', 'disconnected'];

export interface ExternalMappingRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  externalSystem: string;
  externalId: string;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  mappingConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListExternalMappingsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  externalSystem?: string;
  syncStatus?: SyncStatus;
  limit?: number;
  offset?: number;
}

export interface CreateExternalMappingInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  externalSystem: string;
  externalId: string;
  syncStatus?: SyncStatus;
  mappingConfig?: Record<string, unknown>;
}

export interface RecordSyncInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  syncStatus: SyncStatus;
}

export interface DeleteExternalMappingInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_type, entity_id, external_system, external_id,
              sync_status, last_synced_at, mapping_config, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_type: string; entity_id: string;
  external_system: string; external_id: string; sync_status: string;
  last_synced_at: string | null; mapping_config: Record<string, unknown>;
  created_at: string; updated_at: string;
}): ExternalMappingRow => ({
  id: x.id, tenantId: x.tenant_id, entityType: x.entity_type, entityId: x.entity_id,
  externalSystem: x.external_system, externalId: x.external_id,
  syncStatus: x.sync_status as SyncStatus, lastSyncedAt: x.last_synced_at,
  mappingConfig: x.mapping_config ?? {}, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listExternalMappings(
  client: DbClient,
  input: ListExternalMappingsInput,
): Promise<{ rows: ExternalMappingRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.externalSystem) { params.push(input.externalSystem); where += ` AND external_system = $${params.length}`; }
  if (input.syncStatus) { params.push(input.syncStatus); where += ` AND sync_status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_external_mappings
     WHERE ${where} ORDER BY external_system ASC, created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_external_mappings WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getExternalMapping(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ExternalMappingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_external_mappings
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createExternalMapping(
  client: DbClient,
  input: CreateExternalMappingInput,
): Promise<ExternalMappingRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.externalSystem || !input.externalId) {
    throw Object.assign(
      new Error('entityType, entityId, externalSystem, externalId required'),
      { code: 'bad_input' },
    );
  }
  if (input.syncStatus && !SYNC_STATUSES.includes(input.syncStatus)) {
    throw Object.assign(new Error(`bad sync_status: ${input.syncStatus}`), { code: 'bad_sync_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_external_mappings
       (tenant_id, entity_type, entity_id, external_system, external_id, sync_status, mapping_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityType, input.entityId,
      input.externalSystem, input.externalId,
      input.syncStatus ?? 'synced',
      JSON.stringify(input.mappingConfig ?? {}),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function recordSync(
  client: DbClient,
  input: RecordSyncInput,
): Promise<ExternalMappingRow | null> {
  assertSchema(input.tenantSchema);
  if (!SYNC_STATUSES.includes(input.syncStatus)) {
    throw Object.assign(new Error(`bad sync_status: ${input.syncStatus}`), { code: 'bad_sync_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_external_mappings
        SET sync_status = $3, last_synced_at = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.syncStatus],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteExternalMapping(
  client: DbClient,
  input: DeleteExternalMappingInput,
): Promise<ExternalMappingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".compliance_external_mappings
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
