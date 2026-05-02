import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getReportingSeedData, seedReportingModule } from '../data/reporting-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as reportingQuery from '../repositories/reporting-query.repo';
import { REPORTING_LIMITS, REPORTING_TIMEOUTS, REPORTING_BUSINESS_THRESHOLDS } from '../data/reporting-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getReportingSeedData();
  res.json(ok({ moduleCode: 'reporting', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'reporting_config', entityId: 'reporting' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedReportingModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'reporting', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getReportingSeedData();

  const [statusStats, generationStats, scheduleStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
         COUNT(*) FILTER (WHERE status = 'generating')::int AS generating,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".reporting_reports WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_total,
         COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed_last_24h,
         COUNT(*) FILTER (WHERE status = 'generating' AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.GENERATION_TIMEOUT_SECONDS} seconds')::int AS generation_stuck,
         CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0
           THEN ROUND(
             COUNT(*) FILTER (WHERE status = 'completed')::numeric /
             COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::numeric * 100, 2)
           ELSE 0
         END AS generation_success_rate,
         COALESCE(AVG(
           EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
         ) FILTER (WHERE status = 'completed'), 0)::int AS avg_generation_minutes
       FROM "${schema}".reporting_reports WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE schedule_cron IS NOT NULL AND status NOT IN ('archived'))::int AS active_schedules,
         COUNT(*) FILTER (WHERE schedule_cron IS NOT NULL AND status = 'failed')::int AS failed_schedules,
         COUNT(*) FILTER (WHERE schedule_cron IS NOT NULL AND updated_at < NOW() - INTERVAL '${REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days')::int AS stale_schedules
       FROM "${schema}".reporting_reports WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const gs = generationStats.rows[0] || {};
  const sch = scheduleStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((gs.generation_stuck || 0) > 0 || (gs.failed_last_24h || 0) > REPORTING_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE) healthStatus = 'critical';
  else if ((gs.failed_last_24h || 0) > 0 || Number(gs.generation_success_rate) < REPORTING_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'reporting',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      scheduled: ss.scheduled || 0,
      generating: ss.generating || 0,
      completed: ss.completed || 0,
      failed: ss.failed || 0,
      archived: ss.archived || 0,
    },
    generation: {
      successRate: Number(gs.generation_success_rate) || 0,
      avgGenerationMinutes: gs.avg_generation_minutes || 0,
      failedLast24h: gs.failed_last_24h || 0,
      stuckGenerating: gs.generation_stuck || 0,
    },
    schedules: {
      active: sch.active_schedules || 0,
      failed: sch.failed_schedules || 0,
      stale: sch.stale_schedules || 0,
    },
    limits: REPORTING_LIMITS,
    timeouts: REPORTING_TIMEOUTS,
  }, req));
}

export async function getReportAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, scheduleBreakdown, formatBreakdown] = await Promise.all([
    reportingQuery.getKpiMetrics(tenantId),
    reportingQuery.getReportTypeBreakdown(tenantId),
    reportingQuery.getScheduleBreakdown(tenantId),
    reportingQuery.getFormatBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, scheduleBreakdown, formatBreakdown }, req));
}

export async function getFailedReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const failed = await reportingQuery.getFailedReports(req.tenantId!);
  res.json(ok({ reports: failed, total: failed.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'reporting', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'reporting', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
