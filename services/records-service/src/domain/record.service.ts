import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface RecordRecord {
  record_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: string;
  classification: string;
  retention_period_days: string;
  owner_id: string;
  file_path: string;
  file_size: number;
  version: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateRecordInput {
  title: string;
  description?: string;
  type: string;
  category?: string;
  status?: string;
  classification?: string;
  retention_period_days?: string;
  owner_id?: string;
  file_path?: string;
  file_size?: number;
  version?: string;
}

export interface ListRecordOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `record_id, tenant_id, title, description, type, category, status, classification, retention_period_days, owner_id, file_path, file_size, version, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListRecordOptions = {},
): Promise<{ data: RecordRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = options.sortBy && ['created_at', 'updated_at', 'title', 'status'].includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.records ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.records ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as RecordRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[records-service] Failed to list records', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<RecordRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.records WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as RecordRecord) || null;
  } catch (err) {
    logger.error('[records-service] Failed to get record', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateRecordInput): Promise<RecordRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.records (record_id, tenant_id, title, description, type, category, status, classification, retention_period_days, owner_id, file_path, file_size, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.category ?? null, input.status ?? null, input.classification ?? null, input.retention_period_days ?? null, input.owner_id ?? null, input.file_path ?? null, input.file_size ?? null, input.version ?? null],
    );
    logger.info('[records-service] Record created', { id, tenantId });
    return result.rows[0] as RecordRecord;
  } catch (err) {
    logger.error('[records-service] Failed to create record', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateRecordInput>): Promise<RecordRecord | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, id];
  let idx = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${col} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      `UPDATE dos.records SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[records-service] Record updated', { id, tenantId });
    return (result.rows[0] as RecordRecord) || null;
  } catch (err) {
    logger.error('[records-service] Failed to update record', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.records SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[records-service] Record soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[records-service] Failed to delete record', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<RecordRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.records SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[records-service] Record restored', { id, tenantId });
    return result.rows[0] as RecordRecord;
  } catch (err) {
    logger.error('[records-service] Failed to restore record', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateRecordInput[]): Promise<RecordRecord[]> {
  const results: RecordRecord[] = [];
  for (const input of items) {
    const item = await create(tenantId, input);
    results.push(item);
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await safeQuery(
      `UPDATE dos.records SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND record_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[records-service] Records bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[records-service] Failed to bulk delete records', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.records WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.records WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[records-service] Failed to get record stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const RecordService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
