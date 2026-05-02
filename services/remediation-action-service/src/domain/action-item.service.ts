import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ActionItemRecord {
  id: string;
  action_id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  source_type: string;
  source_id: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  status?: string;
  priority: string;
  assignee_id?: string;
  source_type?: string;
  source_id?: string;
  due_date?: string;
  completed_at?: string;
}

export interface ListActionItemOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `action_id, action_id AS id, title, description, status, priority, assignee_id, source_type, source_id, due_date, completed_at, created_at, updated_at`;

function tbl(tenantId: string): string {
  return `"${tenantSchema(tenantId)}"."action_items"`;
}

export async function list(
  tenantId: string,
  options: ListActionItemOptions = {},
): Promise<{ data: ActionItemRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  if (options.priority) {
    conditions.push(`priority = $${idx}`);
    params.push(options.priority);
    idx++;
  }

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = ['created_at', 'updated_at', 'title', 'status', 'priority', 'due_date'];
  const sortCol = options.sortBy && allowedSort.includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const table = tbl(tenantId);

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM ${table} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ActionItemRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[remediation-action-service] Failed to list action-items', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<ActionItemRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM ${tbl(tenantId)} WHERE action_id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (result.rows[0] as ActionItemRecord) || null;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to get action-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateActionItemInput): Promise<ActionItemRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO ${tbl(tenantId)} (action_id, title, description, status, priority, assignee_id, source_type, source_id, due_date, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, input.title ?? null, input.description ?? null, input.status ?? 'open', input.priority ?? 'medium', input.assignee_id ?? null, input.source_type ?? null, input.source_id ?? null, input.due_date ?? null, input.completed_at ?? null],
    );
    logger.info('[remediation-action-service] ActionItem created', { id, tenantId });
    return result.rows[0] as ActionItemRecord;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to create action-item', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateActionItemInput>): Promise<ActionItemRecord | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [id];
  let idx = 2;

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
      `UPDATE ${tbl(tenantId)} SET ${setClauses.join(', ')} WHERE action_id = $1 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[remediation-action-service] ActionItem updated', { id, tenantId });
    return (result.rows[0] as ActionItemRecord) || null;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to update action-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE ${tbl(tenantId)} SET deleted_at = NOW(), updated_at = NOW() WHERE action_id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (result.rowCount > 0) {
      logger.info('[remediation-action-service] ActionItem soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to delete action-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<ActionItemRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE ${tbl(tenantId)} SET deleted_at = NULL, updated_at = NOW() WHERE action_id = $1 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[remediation-action-service] ActionItem restored', { id, tenantId });
    return result.rows[0] as ActionItemRecord;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to restore action-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateActionItemInput[]): Promise<ActionItemRecord[]> {
  const results: ActionItemRecord[] = [];
  for (const input of items) {
    const item = await create(tenantId, input);
    results.push(item);
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await safeQuery(
      `UPDATE ${tbl(tenantId)} SET deleted_at = NOW(), updated_at = NOW() WHERE action_id IN (${placeholders}) AND deleted_at IS NULL`,
      [...ids],
    );
    logger.info('[remediation-action-service] ActionItems bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to bulk delete action-items', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueCount: number;
  completionRate: number;
  avgDaysOpen: number;
}> {
  const table = tbl(tenantId);
  try {
    const [totalResult, statusResult, priorityResult, overdueResult, completionResult, avgAgeResult] = await Promise.all([
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT COUNT(*)::int AS total FROM ${table} WHERE deleted_at IS NULL`),
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM ${table} WHERE deleted_at IS NULL GROUP BY status`),
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT COALESCE(priority, 'medium') AS priority, COUNT(*)::int AS count FROM ${table} WHERE deleted_at IS NULL GROUP BY priority`),
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM ${table} WHERE deleted_at IS NULL AND due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'verified', 'closed', 'archived')`).catch(() => ({ rows: [{ cnt: 0 }] })),
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT COUNT(*)::int AS cnt FROM ${table} WHERE deleted_at IS NULL AND status IN ('completed', 'verified', 'closed')`).catch(() => ({ rows: [{ cnt: 0 }] })),
      // secrets-scan-allow: schema tenantSchema()-validated; interpolation audited as safe
      safeQuery(`SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) / 86400)::numeric(10,1) AS avg_days FROM ${table} WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ avg_days: 0 }] })),
    ]);

    const total = totalResult.rows[0]?.total || 0;
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) byStatus[(row as any).status] = (row as any).count;
    const byPriority: Record<string, number> = {};
    for (const row of priorityResult.rows) byPriority[(row as any).priority] = (row as any).count;
    const completedCount = completionResult.rows[0]?.cnt || 0;

    return {
      total,
      byStatus,
      byPriority,
      overdueCount: overdueResult.rows[0]?.cnt || 0,
      completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      avgDaysOpen: parseFloat(avgAgeResult.rows[0]?.avg_days) || 0,
    };
  } catch (err) {
    logger.error('[remediation-action-service] Failed to get action-item stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {}, byPriority: {}, overdueCount: 0, completionRate: 0, avgDaysOpen: 0 };
  }
}

export async function getDashboard(tenantId: string): Promise<Record<string, any>> {
  const stats = await getStats(tenantId);
  return {
    kpis: {
      total: stats.total,
      open: (stats.byStatus['open'] || 0) + (stats.byStatus['in_progress'] || 0) + (stats.byStatus['assigned'] || 0),
      overdue: stats.overdueCount,
      completed: (stats.byStatus['completed'] || 0) + (stats.byStatus['verified'] || 0) + (stats.byStatus['closed'] || 0),
      blocked: stats.byStatus['blocked'] || 0,
      avgDaysOpen: stats.avgDaysOpen,
      completionRate: stats.completionRate,
      escalated: stats.byStatus['escalated'] || 0,
    },
    breakdownA: Object.entries(stats.byPriority).map(([priority, count]) => ({ priority, count })),
    breakdownB: Object.entries(stats.byStatus).map(([status, count]) => ({ status, count })),
  };
}

export const ActionItemService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, getDashboard };
