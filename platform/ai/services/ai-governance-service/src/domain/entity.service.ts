import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

/**
 * Generic entity service for ai-governance-service.
 *
 * All 31 entity types share the unified per-tenant table
 *   <tenant_schema>.ai_governance_entities
 * with the `entity_type` column acting as the discriminator.
 *
 * Tenant safety: schema name is derived from the validated tenantId via
 * @dos/db tenantSchema(); SQL identifiers are quoted; payload is bound as
 * parameterised values only.
 */

export interface EntityRecord {
  id: string;
  tenant_id: string;
  entity_type: string;
  title: string | null;
  status: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateEntityInput {
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEntityInput {
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `id, tenant_id, entity_type, title, status, metadata, created_at, updated_at, created_by, updated_by`;
const SORTABLE = new Set(['created_at', 'updated_at', 'title', 'status']);

function table(tenantId: string): string {
  // tenantSchema() asserts and validates the tenantId — schema name is safe
  // to interpolate into the SQL identifier here.
  return `"${tenantSchema(tenantId)}"."ai_governance_entities"`;
}

export async function list(
  tenantId: string,
  entityType: string,
  options: ListOptions = {},
): Promise<{ data: EntityRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['tenant_id = $1', 'entity_type = $2', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId, entityType];
  let idx = 3;

  if (options.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }
  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR (metadata->>'description') ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = options.sortBy && SORTABLE.has(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const t = table(tenantId);
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM ${t} ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM ${t} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as EntityRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[ai-governance-service] list failed', { tenantId, entityType, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(
  tenantId: string,
  entityType: string,
  id: string,
): Promise<EntityRecord | null> {
  try {
    const t = table(tenantId);
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM ${t} WHERE tenant_id = $1 AND entity_type = $2 AND id = $3 AND deleted_at IS NULL`,
      [tenantId, entityType, id],
    );
    return (result.rows[0] as EntityRecord) || null;
  } catch (err) {
    logger.error('[ai-governance-service] getById failed', { tenantId, entityType, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(
  tenantId: string,
  entityType: string,
  input: CreateEntityInput,
  actorId?: string,
): Promise<EntityRecord> {
  const id = randomUUID();
  const metadata = input.metadata || {};
  const t = table(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO ${t}
         (id, tenant_id, entity_type, title, status, metadata, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
       RETURNING ${COLUMNS}`,
      [id, tenantId, entityType, input.title ?? null, input.status ?? null, JSON.stringify(metadata), actorId ?? null],
    );
    return result.rows[0] as EntityRecord;
  } catch (err) {
    logger.error('[ai-governance-service] create failed', { tenantId, entityType, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(
  tenantId: string,
  entityType: string,
  id: string,
  input: UpdateEntityInput,
  actorId?: string,
): Promise<EntityRecord | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined) { sets.push(`title = $${idx++}`); params.push(input.title); }
  if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
  if (input.metadata !== undefined) {
    sets.push(`metadata = $${idx++}::jsonb`);
    params.push(JSON.stringify(input.metadata));
  }
  sets.push(`updated_at = NOW()`);
  sets.push(`updated_by = $${idx++}`); params.push(actorId ?? null);

  params.push(tenantId, entityType, id);
  const where = `WHERE tenant_id = $${idx++} AND entity_type = $${idx++} AND id = $${idx} AND deleted_at IS NULL`;

  const t = table(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE ${t} SET ${sets.join(', ')} ${where} RETURNING ${COLUMNS}`,
      params,
    );
    return (result.rows[0] as EntityRecord) || null;
  } catch (err) {
    logger.error('[ai-governance-service] update failed', { tenantId, entityType, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function softDelete(
  tenantId: string,
  entityType: string,
  id: string,
  actorId?: string,
): Promise<boolean> {
  const t = table(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE ${t}
         SET deleted_at = NOW(), updated_at = NOW(), updated_by = $4
       WHERE tenant_id = $1 AND entity_type = $2 AND id = $3 AND deleted_at IS NULL`,
      [tenantId, entityType, id, actorId ?? null],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    logger.error('[ai-governance-service] softDelete failed', { tenantId, entityType, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(
  tenantId: string,
  entityType: string,
): Promise<{ total: number; byStatus: Record<string, number> }> {
  const t = table(tenantId);
  try {
    const totalRes = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM ${t}
        WHERE tenant_id = $1 AND entity_type = $2 AND deleted_at IS NULL`,
      [tenantId, entityType],
    );
    const byStatusRes = await safeQuery(
      `SELECT COALESCE(status, 'unspecified') AS status, COUNT(*)::int AS count
         FROM ${t}
        WHERE tenant_id = $1 AND entity_type = $2 AND deleted_at IS NULL
        GROUP BY 1`,
      [tenantId, entityType],
    );
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRes.rows as Array<{ status: string; count: number }>) {
      byStatus[row.status] = row.count;
    }
    return { total: totalRes.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[ai-governance-service] getStats failed', { tenantId, entityType, error: toErrorMessage(err) });
    throw err;
  }
}
