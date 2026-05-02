/**
 * Entities service — compliance scope entities (subsidiaries, business units,
 * legal entities) over `<tenant_schema>.entities`.
 */
import type { DbClient } from '../../db/runner';

export type EntityType =
  | 'subsidiary' | 'business_unit' | 'legal_entity' | 'branch' | 'joint_venture';
const TYPES: ReadonlyArray<EntityType> = [
  'subsidiary', 'business_unit', 'legal_entity', 'branch', 'joint_venture',
];

export type EntityStatus = 'active' | 'inactive' | 'archived';
const STATUSES: ReadonlyArray<EntityStatus> = ['active', 'inactive', 'archived'];

export interface EntityRow {
  id: string;
  name: string;
  entityType: EntityType;
  status: EntityStatus;
  tenantId: string | null;
  createdAt: string;
}

export interface ListEntitiesInput {
  tenantSchema: string;
  entityType?: EntityType;
  status?: EntityStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEntityInput {
  tenantSchema: string;
  actorId: string;
  tenantId: string;
  name: string;
  entityType?: EntityType;
  status?: EntityStatus;
}

export interface UpdateEntityStatusInput {
  tenantSchema: string;
  actorId: string;
  id: string;
  status: EntityStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, name, entity_type, status, tenant_id, created_at`;

const mapRow = (x: {
  id: string; name: string; entity_type: string; status: string;
  tenant_id: string | null; created_at: string;
}): EntityRow => ({
  id: x.id, name: x.name,
  entityType: x.entity_type as EntityType,
  status: x.status as EntityStatus,
  tenantId: x.tenant_id, createdAt: x.created_at,
});

export async function listEntities(
  client: DbClient,
  input: ListEntitiesInput,
): Promise<{ rows: EntityRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".entities
     WHERE ${where} ORDER BY name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".entities WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getEntity(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<EntityRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".entities
     WHERE id = $1`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createEntity(
  client: DbClient,
  input: CreateEntityInput,
): Promise<EntityRow> {
  assertSchema(input.tenantSchema);
  if (!input.name) {
    throw Object.assign(new Error('name required'), { code: 'bad_input' });
  }
  if (input.entityType && !TYPES.includes(input.entityType)) {
    throw Object.assign(new Error(`bad entity_type: ${input.entityType}`), { code: 'bad_type' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".entities
       (name, entity_type, status, tenant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLS}`,
    [
      input.name,
      input.entityType ?? 'subsidiary',
      input.status ?? 'active',
      input.tenantId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateEntityStatus(
  client: DbClient,
  input: UpdateEntityStatusInput,
): Promise<EntityRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".entities
        SET status = $2
      WHERE id = $1
      RETURNING ${COLS}`,
    [input.id, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteEntity(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<EntityRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".entities
      WHERE id = $1
      RETURNING ${COLS}`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
