import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface AgrcTaskRecord {
  task_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  module: string;
  agent_id: string;
  assignee_id: string;
  input_data: unknown;
  output_data: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateAgrcTaskInput {
  title: string;
  description?: string;
  type: string;
  status?: string;
  priority?: string;
  module?: string;
  agent_id?: string;
  assignee_id?: string;
  input_data?: unknown;
  output_data?: unknown;
  started_at?: string;
  completed_at?: string;
}

export interface ListAgrcTaskOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `task_id, tenant_id, title, description, type, status, priority, module, agent_id, assignee_id, input_data, output_data, started_at, completed_at, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListAgrcTaskOptions = {},
): Promise<{ data: AgrcTaskRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.agrc_tasks ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.agrc_tasks ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as AgrcTaskRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[agrc-os-service] Failed to list agrc-tasks', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<AgrcTaskRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.agrc_tasks WHERE tenant_id = $1 AND task_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as AgrcTaskRecord) || null;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to get agrc-task', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateAgrcTaskInput): Promise<AgrcTaskRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.agrc_tasks (task_id, tenant_id, title, description, type, status, priority, module, agent_id, assignee_id, input_data, output_data, started_at, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.status ?? null, input.priority ?? null, input.module ?? null, input.agent_id ?? null, input.assignee_id ?? null, input.input_data ?? null, input.output_data ?? null, input.started_at ?? null, input.completed_at ?? null],
    );
    logger.info('[agrc-os-service] AgrcTask created', { id, tenantId });
    return result.rows[0] as AgrcTaskRecord;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to create agrc-task', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateAgrcTaskInput>): Promise<AgrcTaskRecord | null> {
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
      `UPDATE dos.agrc_tasks SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND task_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[agrc-os-service] AgrcTask updated', { id, tenantId });
    return (result.rows[0] as AgrcTaskRecord) || null;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to update agrc-task', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.agrc_tasks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND task_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[agrc-os-service] AgrcTask soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to delete agrc-task', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<AgrcTaskRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.agrc_tasks SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND task_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[agrc-os-service] AgrcTask restored', { id, tenantId });
    return result.rows[0] as AgrcTaskRecord;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to restore agrc-task', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateAgrcTaskInput[]): Promise<AgrcTaskRecord[]> {
  const results: AgrcTaskRecord[] = [];
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
      `UPDATE dos.agrc_tasks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND task_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[agrc-os-service] AgrcTasks bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[agrc-os-service] Failed to bulk delete agrc-tasks', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.agrc_tasks WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.agrc_tasks WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[agrc-os-service] Failed to get agrc-task stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const AgrcTaskService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
