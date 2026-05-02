import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface WidgetRecord {
  widget_id: string;
  tenant_id: string;
  title: string;
  type: string;
  category: string;
  data_source: string;
  query_config: unknown;
  display_config: unknown;
  refresh_interval_sec: number;
  owner_id: string;
  shared: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateWidgetInput {
  title: string;
  type: string;
  category?: string;
  data_source: string;
  query_config?: unknown;
  display_config?: unknown;
  refresh_interval_sec?: number;
  owner_id?: string;
  shared?: boolean;
}

export interface ListWidgetOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `widget_id, tenant_id, title, type, category, data_source, query_config, display_config, refresh_interval_sec, owner_id, shared, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListWidgetOptions = {},
): Promise<{ data: WidgetRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.widgets ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.widgets ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as WidgetRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to list widgets', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<WidgetRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.widgets WHERE tenant_id = $1 AND widget_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as WidgetRecord) || null;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to get widget', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateWidgetInput): Promise<WidgetRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.widgets (widget_id, tenant_id, title, type, category, data_source, query_config, display_config, refresh_interval_sec, owner_id, shared, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.type ?? null, input.category ?? null, input.data_source ?? null, input.query_config ?? null, input.display_config ?? null, input.refresh_interval_sec ?? null, input.owner_id ?? null, input.shared ?? null],
    );
    logger.info('[dashboard-widgets-service] Widget created', { id, tenantId });
    return result.rows[0] as WidgetRecord;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to create widget', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateWidgetInput>): Promise<WidgetRecord | null> {
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
      `UPDATE dos.widgets SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND widget_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[dashboard-widgets-service] Widget updated', { id, tenantId });
    return (result.rows[0] as WidgetRecord) || null;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to update widget', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.widgets SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND widget_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[dashboard-widgets-service] Widget deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to delete widget', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.widgets SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND widget_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[dashboard-widgets-service] Widget restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to restore widget', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateWidgetInput[]): Promise<WidgetRecord[]> {
  const results: WidgetRecord[] = [];
  for (const input of items) {
    results.push(await create(tenantId, input));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  try {
    const result = await safeQuery(
      `UPDATE dos.widgets SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND widget_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.widgets WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.widgets WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[dashboard-widgets-service] Failed to get widget stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/dashboard with try/catch guards

/**
 * Get risk heatmap widget data.
 */
export async function getRiskHeatmapData(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/widget-data.service') as any;
    return mod.getRiskHeatmapData(tenantId);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module getRiskHeatmapData unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get compliance trend widget data.
 */
export async function getComplianceTrendData(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/widget-data.service') as any;
    return mod.getComplianceTrendData(tenantId);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module getComplianceTrendData unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get widget insights (AI-powered).
 */
export async function getWidgetInsights(tenantId: string, widgetId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/widget-insights.service') as any;
    return mod.getWidgetInsights(tenantId, widgetId);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module getWidgetInsights unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Compose a dashboard layout from template.
 */
export async function composeDashboard(tenantId: string, templateKey: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/dashboard-composer.service') as any;
    return mod.composeDashboard(tenantId, templateKey);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module composeDashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get dashboard zones (4-zone workspace home).
 */
export async function getDashboardZones(tenantId: string, userId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/dashboard-zones.service') as any;
    return mod.getDashboardZones(tenantId, userId);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module getDashboardZones unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Invalidate dashboard cache for tenant.
 */
export async function invalidateCache(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/dashboard/dist/dashboard/services/dashboard-cache-invalidator.service') as any;
    return mod.invalidateCache(tenantId);
  } catch (err) {
    logger.warn('[dashboard-widgets-service] Module invalidateCache unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const WidgetService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, getRiskHeatmapData, getComplianceTrendData, getWidgetInsights, composeDashboard, getDashboardZones, invalidateCache };
