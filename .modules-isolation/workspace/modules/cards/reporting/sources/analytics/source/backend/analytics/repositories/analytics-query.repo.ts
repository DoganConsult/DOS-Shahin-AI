import { safeQuery, tenantSchema } from '../ports/database.port';
import { ANALYTICS_BUSINESS_THRESHOLDS } from '../data/analytics-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".analytics_dashboards
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalDashboards: number;
  activeDashboards: number;
  publishedDashboards: number;
  staleDashboards: number;
  totalWidgets: number;
  staleWidgets: number;
  avgRefreshMinutes: number;
  kpiCoverageRate: number;
  publishRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const [dashResult, widgetResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('archived', 'deprecated'))::int AS active,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days' AND status NOT IN ('archived', 'deprecated'))::int AS stale
      FROM "${schema}".analytics_dashboards
      WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours')::int AS stale,
        COALESCE(AVG(refresh_interval_minutes)::int, 0) AS avg_refresh_minutes
      FROM "${schema}".analytics_widgets
      WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{ total: 0, stale: 0, avg_refresh_minutes: 0 }] })),
  ]);

  const d = dashResult.rows[0] || {};
  const w = widgetResult.rows[0] || {};
  const total = d.total || 0;
  return {
    totalDashboards: total,
    activeDashboards: d.active || 0,
    publishedDashboards: d.published || 0,
    staleDashboards: d.stale || 0,
    totalWidgets: w.total || 0,
    staleWidgets: w.stale || 0,
    avgRefreshMinutes: w.avg_refresh_minutes || 0,
    kpiCoverageRate: total > 0 ? Math.round(((d.published || 0) / total) * 100 * 100) / 100 : 0,
    publishRate: total > 0 ? Math.round(((d.published || 0) / total) * 100 * 100) / 100 : 0,
  };
}

export async function getWidgetTypeBreakdown(tenantId: string): Promise<Array<{
  widgetType: string; count: number; staleCount: number; failedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(widget_type, 'unknown') AS widget_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours')::int AS stale_count,
      COUNT(*) FILTER (WHERE refresh_failed = true)::int AS failed_count
    FROM "${schema}".analytics_widgets
    WHERE deleted_at IS NULL
    GROUP BY widget_type
    ORDER BY count DESC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    widgetType: String(r.widget_type ?? 'unknown'),
    count: Number(r.count ?? 0),
    staleCount: Number(r.stale_count ?? 0),
    failedCount: Number(r.failed_count ?? 0),
  }));
}

export async function getDataSourceBreakdown(tenantId: string): Promise<Array<{
  dataSource: string; dashboardCount: number; widgetCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(data_source, 'unknown') AS data_source,
      COUNT(DISTINCT dashboard_id)::int AS dashboard_count,
      COUNT(*)::int AS widget_count
    FROM "${schema}".analytics_widgets
    WHERE deleted_at IS NULL
    GROUP BY data_source
    ORDER BY widget_count DESC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    dataSource: String(r.data_source ?? 'unknown'),
    dashboardCount: Number(r.dashboard_count ?? 0),
    widgetCount: Number(r.widget_count ?? 0),
  }));
}

export async function getStaleWidgets(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  widgetType: string;
  dashboardId: string;
  dataSource: string;
  lastRefreshedAt: string | null;
  hoursStale: number;
  refreshFailed: boolean;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      w.id, w.title, w.widget_type, w.dashboard_id, w.data_source,
      w.last_refreshed_at, w.refresh_failed,
      EXTRACT(HOUR FROM NOW() - COALESCE(w.last_refreshed_at, w.created_at))::int AS hours_stale
    FROM "${schema}".analytics_widgets w
    WHERE w.deleted_at IS NULL
      AND (w.last_refreshed_at IS NULL OR w.last_refreshed_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours')
    ORDER BY hours_stale DESC
    LIMIT 100
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    widgetType: String(r.widget_type ?? 'unknown'),
    dashboardId: String(r.dashboard_id ?? ''),
    dataSource: String(r.data_source ?? 'unknown'),
    lastRefreshedAt: r.last_refreshed_at == null ? null : String(r.last_refreshed_at),
    hoursStale: Number(r.hours_stale ?? 0),
    refreshFailed: Boolean(r.refresh_failed),
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN updated_at > NOW() - INTERVAL '7 days' THEN '0-7d'
        WHEN updated_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN updated_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        ELSE '90d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".analytics_dashboards
    WHERE deleted_at IS NULL AND status NOT IN ('archived', 'deprecated')
    GROUP BY bucket ORDER BY MIN(updated_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  dashboardType?: string;
  dataSource?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const sortBy = params.sortBy || 'created_at';
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (params.query) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.dashboardType) { conditions.push(`dashboard_type = $${idx}`); values.push(params.dashboardType); idx++; }
  if (params.dataSource) {
    conditions.push(`id IN (SELECT DISTINCT dashboard_id FROM "${schema}".analytics_widgets WHERE data_source = $${idx} AND deleted_at IS NULL)`);
    values.push(params.dataSource);
    idx++;
  }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".analytics_dashboards WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".analytics_dashboards WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.dashboardType) { conditions.push(`dashboard_type = $${idx}`); values.push(filters.dashboardType); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".analytics_dashboards WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx}`,
    [...values, ANALYTICS_LIMITS_EXPORT],
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT d.id, d.title, d.status, d.dashboard_type, d.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".analytics_dashboards d
    JOIN "${schema}".entity_links el ON el.source_entity_id = d.id AND el.source_module = 'analytics'
    WHERE d.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY d.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

const ANALYTICS_LIMITS_EXPORT = 50000;
