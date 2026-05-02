/**
 * Tags service — tenant-scoped polymorphic key/value tags
 * over `<tenant_schema>.compliance_tags`.
 *
 * Polymorphic association via (entity_type, entity_id). Plain CRUD
 * (create/delete; update is treated as delete+create by callers).
 */
import type { DbClient } from '../../db/runner';

export interface TagRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  tagKey: string;
  tagValue: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTagsInput {
  tenantSchema: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  tagKey?: string;
  tagValue?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTagInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  tagKey: string;
  tagValue: string;
}

export interface DeleteTagInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, entity_type, entity_id, tag_key, tag_value,
              created_by, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; entity_type: string; entity_id: string;
  tag_key: string; tag_value: string; created_by: string;
  created_at: string; updated_at: string;
}): TagRow => ({
  id: x.id, tenantId: x.tenant_id, entityType: x.entity_type, entityId: x.entity_id,
  tagKey: x.tag_key, tagValue: x.tag_value, createdBy: x.created_by,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listTags(
  client: DbClient,
  input: ListTagsInput,
): Promise<{ rows: TagRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.tagKey) { params.push(input.tagKey); where += ` AND tag_key = $${params.length}`; }
  if (input.tagValue) { params.push(input.tagValue); where += ` AND tag_value = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_tags
     WHERE ${where} ORDER BY tag_key ASC, tag_value ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_tags WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getTag(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<TagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_tags
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createTag(
  client: DbClient,
  input: CreateTagInput,
): Promise<TagRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.tagKey || !input.tagValue) {
    throw Object.assign(
      new Error('entityType, entityId, tagKey, tagValue required'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_tags
       (tenant_id, entity_type, entity_id, tag_key, tag_value, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.entityType, input.entityId,
      input.tagKey, input.tagValue, input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteTag(
  client: DbClient,
  input: DeleteTagInput,
): Promise<TagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".compliance_tags
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
