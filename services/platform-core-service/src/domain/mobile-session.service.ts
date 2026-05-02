import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface MobileSessionRecord {
  session_id: string;
  tenant_id: string;
  user_id: string;
  device_type: string;
  device_id: string;
  push_token: string;
  app_version: string;
  os_version: string;
  status: string;
  last_active_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateMobileSessionInput {
  user_id: string;
  device_type: string;
  device_id?: string;
  push_token?: string;
  app_version?: string;
  os_version?: string;
  status?: string;
  last_active_at?: string;
}

export interface ListMobileSessionOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `session_id, tenant_id, user_id, device_type, device_id, push_token, app_version, os_version, status, last_active_at, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListMobileSessionOptions = {},
): Promise<{ data: MobileSessionRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.mobile_sessions ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.mobile_sessions ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as MobileSessionRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[platform-core-service] Failed to list mobile-sessions', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<MobileSessionRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.mobile_sessions WHERE tenant_id = $1 AND session_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as MobileSessionRecord) || null;
  } catch (err) {
    logger.error('[platform-core-service] Failed to get mobile-session', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateMobileSessionInput): Promise<MobileSessionRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.mobile_sessions (session_id, tenant_id, user_id, device_type, device_id, push_token, app_version, os_version, status, last_active_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.user_id ?? null, input.device_type ?? null, input.device_id ?? null, input.push_token ?? null, input.app_version ?? null, input.os_version ?? null, input.status ?? null, input.last_active_at ?? null],
    );
    logger.info('[platform-core-service] MobileSession created', { id, tenantId });
    return result.rows[0] as MobileSessionRecord;
  } catch (err) {
    logger.error('[platform-core-service] Failed to create mobile-session', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateMobileSessionInput>): Promise<MobileSessionRecord | null> {
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
      `UPDATE dos.mobile_sessions SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND session_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[platform-core-service] MobileSession updated', { id, tenantId });
    return (result.rows[0] as MobileSessionRecord) || null;
  } catch (err) {
    logger.error('[platform-core-service] Failed to update mobile-session', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.mobile_sessions SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND session_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[platform-core-service] MobileSession deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[platform-core-service] Failed to delete mobile-session', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<MobileSessionRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.mobile_sessions SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND session_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[platform-core-service] MobileSession restored', { id, tenantId });
      return result.rows[0] as MobileSessionRecord;
    }
    return null;
  } catch (err) {
    logger.error('[platform-core-service] Failed to restore mobile-session', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateMobileSessionInput[]): Promise<MobileSessionRecord[]> {
  const results: MobileSessionRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.mobile_sessions SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND session_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[platform-core-service] MobileSessions bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[platform-core-service] Failed to bulk delete mobile-sessions', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.mobile_sessions WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.mobile_sessions WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[platform-core-service] Failed to get mobile-session stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const MobileSessionService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
