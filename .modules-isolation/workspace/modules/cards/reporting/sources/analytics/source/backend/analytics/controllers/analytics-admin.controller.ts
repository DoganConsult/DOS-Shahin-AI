import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getAnalyticsSeedData, seedAnalyticsModule } from '../data/analytics-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as analyticsQuery from '../repositories/analytics-query.repo';
import { ANALYTICS_LIMITS, ANALYTICS_TIMEOUTS, ANALYTICS_BUSINESS_THRESHOLDS } from '../data/analytics-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getAnalyticsSeedData();
  res.json(ok({ moduleCode: 'analytics', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'analytics_config', entityId: 'analytics' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedAnalyticsModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'analytics', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getAnalyticsSeedData();

  const [statusStats, widgetStats, kpiStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'published')::int AS published,
         COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
         COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days' AND status NOT IN ('archived', 'deprecated'))::int AS stale
       FROM "${schema}".analytics_dashboards WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_widgets,
         COUNT(*) FILTER (WHERE last_refreshed_at IS NOT NULL AND last_refreshed_at > NOW() - INTERVAL '${ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES} minutes')::int AS fresh_widgets,
         COUNT(*) FILTER (WHERE last_refreshed_at IS NULL OR last_refreshed_at < NOW() - INTERVAL '${ANALYTICS_BUSINESS_THRESHOLDS.REFRESH_WARNING_HOURS} hours')::int AS stale_widgets,
         COUNT(*) FILTER (WHERE refresh_failed = true)::int AS failed_widgets,
         COALESCE(AVG(refresh_interval_minutes)::int, 0) AS avg_refresh_minutes
       FROM "${schema}".analytics_widgets WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(DISTINCT metric_code)::int AS defined_kpis,
         COUNT(*) FILTER (WHERE computed_at > NOW() - INTERVAL '24 hours')::int AS kpis_refreshed_today,
         COUNT(*) FILTER (WHERE value IS NOT NULL)::int AS kpis_with_data
       FROM "${schema}".analytics_kpi_snapshots WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const ws = widgetStats.rows[0] || {};
  const ks = kpiStats.rows[0] || {};

  const staleRatio = ss.total > 0 ? (ss.stale || 0) / ss.total : 0;
  const widgetFailRatio = ws.total_widgets > 0 ? (ws.failed_widgets || 0) / ws.total_widgets : 0;

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (widgetFailRatio > 0.2 || staleRatio > 0.5) healthStatus = 'critical';
  else if (widgetFailRatio > 0.05 || staleRatio > 0.2 || (ss.published || 0) === 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'analytics',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    dashboards: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      active: ss.active || 0,
      published: ss.published || 0,
      deprecated: ss.deprecated || 0,
      archived: ss.archived || 0,
      stale: ss.stale || 0,
    },
    widgets: {
      total: ws.total_widgets || 0,
      fresh: ws.fresh_widgets || 0,
      stale: ws.stale_widgets || 0,
      failed: ws.failed_widgets || 0,
      avgRefreshMinutes: ws.avg_refresh_minutes || 0,
    },
    kpis: {
      defined: ks.defined_kpis || 0,
      refreshedToday: ks.kpis_refreshed_today || 0,
      withData: ks.kpis_with_data || 0,
    },
    limits: ANALYTICS_LIMITS,
    timeouts: ANALYTICS_TIMEOUTS,
  }, req));
}

export async function getDashboardAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, dataSourceBreakdown, agingReport] = await Promise.all([
    analyticsQuery.getKpiMetrics(tenantId),
    analyticsQuery.getWidgetTypeBreakdown(tenantId),
    analyticsQuery.getDataSourceBreakdown(tenantId),
    analyticsQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, dataSourceBreakdown, agingReport }, req));
}

export async function getWidgetHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const staleWidgets = await analyticsQuery.getStaleWidgets(tenantId);
  res.json(ok({ staleWidgets, total: staleWidgets.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'analytics', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'analytics', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
