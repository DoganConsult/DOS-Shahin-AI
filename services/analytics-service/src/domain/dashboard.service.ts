import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface DashboardRecord {
  dashboard_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  layout: unknown;
  owner_id: string;
  is_default: boolean;
  shared: boolean;
  widgets: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateDashboardInput {
  title: string;
  description?: string;
  type: string;
  layout?: unknown;
  owner_id?: string;
  is_default?: boolean;
  shared?: boolean;
  widgets?: unknown;
}

export interface ListDashboardOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `dashboard_id, tenant_id, title, description, type, layout, owner_id, is_default, shared, widgets, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListDashboardOptions = {},
): Promise<{ data: DashboardRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.dashboards ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.dashboards ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as DashboardRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[analytics-service] Failed to list dashboards', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<DashboardRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.dashboards WHERE tenant_id = $1 AND dashboard_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as DashboardRecord) || null;
  } catch (err) {
    logger.error('[analytics-service] Failed to get dashboard', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateDashboardInput): Promise<DashboardRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.dashboards (dashboard_id, tenant_id, title, description, type, layout, owner_id, is_default, shared, widgets, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.layout ?? null, input.owner_id ?? null, input.is_default ?? null, input.shared ?? null, input.widgets ?? null],
    );
    logger.info('[analytics-service] Dashboard created', { id, tenantId });
    return result.rows[0] as DashboardRecord;
  } catch (err) {
    logger.error('[analytics-service] Failed to create dashboard', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateDashboardInput>): Promise<DashboardRecord | null> {
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
      `UPDATE dos.dashboards SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND dashboard_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[analytics-service] Dashboard updated', { id, tenantId });
    return (result.rows[0] as DashboardRecord) || null;
  } catch (err) {
    logger.error('[analytics-service] Failed to update dashboard', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.dashboards SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND dashboard_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[analytics-service] Dashboard deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[analytics-service] Failed to delete dashboard', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.dashboards SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND dashboard_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[analytics-service] Dashboard restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[analytics-service] Failed to restore dashboard', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateDashboardInput[]): Promise<DashboardRecord[]> {
  const results: DashboardRecord[] = [];
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
      `UPDATE dos.dashboards SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND dashboard_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[analytics-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.dashboards WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.dashboards WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[analytics-service] Failed to get dashboard stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/analytics with try/catch guards

/**
 * Compute tenant KPIs (compliance score, risk score, evidence coverage, remediation closure rate).
 */
export async function computeKPIs(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/analytics/analytics-kpi.service') as any;
    return mod.computeKPIs(tenantId);
  } catch (err) {
    logger.warn('[analytics-service] Module computeKPIs unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Run daily KPI aggregation job for a tenant.
 */
export async function runAggregationJob(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/analytics/analytics-trends.service') as any;
    return mod.runAggregationJob(tenantId);
  } catch (err) {
    logger.warn('[analytics-service] Module runAggregationJob unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get KPI trend snapshots for a tenant.
 */
export async function getKpiTrends(tenantId: string, days?: number): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/analytics/analytics-trends.service') as any;
    return mod.getKpiTrends(tenantId, days);
  } catch (err) {
    logger.warn('[analytics-service] Module getKpiTrends unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get cross-tenant benchmark data.
 */
export async function getBenchmarkData(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/analytics/analytics-benchmarking.service') as any;
    return mod.getBenchmarkData(tenantId);
  } catch (err) {
    logger.warn('[analytics-service] Module getBenchmarkData unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Compute composite tenant health score.
 */
export async function computeTenantHealthScore(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/analytics/analytics-health.service') as any;
    return mod.computeTenantHealthScore(tenantId);
  } catch (err) {
    logger.warn('[analytics-service] Module computeTenantHealthScore unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Forecast compliance score using linear regression.
 */
export async function forecastComplianceScore(tenantId: string, daysAhead?: number): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/misc/predictive-analytics.service') as any;
    return mod.forecastComplianceScore(tenantId, daysAhead);
  } catch (err) {
    logger.warn('[analytics-service] Module forecastComplianceScore unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Compute vendor engagement score.
 */
export async function computeEngagementScore(tenantId: string, vendorId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/engagement/engagement-score.service') as any;
    return mod.computeEngagementScore(tenantId, vendorId);
  } catch (err) {
    logger.warn('[analytics-service] Module computeEngagementScore unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Detect metric anomalies.
 */
export async function detectAnomalies(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../../modules/analytics/dist/analytics/services/misc/metric-anomaly-detector.service') as any;
    return mod.detectAnomalies(tenantId);
  } catch (err) {
    logger.warn('[analytics-service] Module detectAnomalies unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const DashboardService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, computeKPIs, runAggregationJob, getKpiTrends, getBenchmarkData, computeTenantHealthScore, forecastComplianceScore, computeEngagementScore, detectAnomalies };
