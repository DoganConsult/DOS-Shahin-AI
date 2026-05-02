import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getWorkflowSeedData, seedWorkflowModule } from '../data/workflow-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as workflowQuery from '../repositories/workflow-query.repo';
import { WORKFLOW_LIMITS, WORKFLOW_TIMEOUTS, WORKFLOW_BUSINESS_THRESHOLDS, WORKFLOW_SLA_DEFAULTS } from '../data/workflow-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getWorkflowSeedData();
  res.json(ok({ moduleCode: 'workflow', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'workflow_config', entityId: 'workflow' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedWorkflowModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'workflow', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getWorkflowSeedData();

  const [statusStats, slaStats, approvalStats] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'paused')::int AS paused,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
        ROUND(
          COUNT(*) FILTER (WHERE status IN ('completed', 'archived'))::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled', 'failed', 'archived')), 0)::numeric * 100, 2
        ) AS completion_rate,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
            FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL),
          0
        )::numeric(10,2) AS avg_completion_days
      FROM "${schema}".workflow_workflows
      WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),

    safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('active', 'paused')
          AND due_date IS NOT NULL AND due_date < NOW())::int AS sla_breached,
        COUNT(*) FILTER (WHERE status IN ('active', 'paused')
          AND due_date IS NOT NULL
          AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${WORKFLOW_TIMEOUTS.REMINDER_BEFORE_HOURS} hours')::int AS sla_at_risk,
        ROUND(
          COUNT(*) FILTER (WHERE status IN ('completed', 'archived')
            AND completed_at IS NOT NULL AND due_date IS NOT NULL AND completed_at <= due_date)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'archived') AND completed_at IS NOT NULL AND due_date IS NOT NULL), 0)::numeric * 100, 2
        ) AS sla_compliance_rate,
        COUNT(*) FILTER (WHERE status IN ('active', 'paused')
          AND updated_at < NOW() - INTERVAL '${WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days')::int AS stuck_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
      FROM "${schema}".workflow_workflows
      WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),

    // secrets-scan-allow: schema tenantSchema()-validated; ORDER BY column from typed union
    safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' AND current_step ILIKE '%approval%')::int AS pending_approvals,
        COUNT(*) FILTER (WHERE status = 'active' AND current_step ILIKE '%approval%'
          AND updated_at < NOW() - INTERVAL '${WORKFLOW_SLA_DEFAULTS.high} hours')::int AS stale_approvals
      FROM "${schema}".workflow_workflows
      WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const sl = slaStats.rows[0] || {};
  const ap = approvalStats.rows[0] || {};

  const slaComplianceRate = Number(sl.sla_compliance_rate) || 100;
  const completionRate = Number(ss.completion_rate) || 0;

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (
    (sl.failed_count || 0) > 5 ||
    (sl.sla_breached || 0) > 10 ||
    slaComplianceRate < WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_CRITICAL
  ) {
    healthStatus = 'critical';
  } else if (
    (sl.stuck_count || 0) > 0 ||
    (sl.sla_breached || 0) > 0 ||
    (ap.stale_approvals || 0) > 3 ||
    slaComplianceRate < WORKFLOW_BUSINESS_THRESHOLDS.SUCCESS_RATE_WARNING
  ) {
    healthStatus = 'degraded';
  }

  res.json(ok({
    moduleCode: 'workflow',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      active: ss.active || 0,
      paused: ss.paused || 0,
      completed: ss.completed || 0,
      failed: ss.failed || 0,
      cancelled: ss.cancelled || 0,
      archived: ss.archived || 0,
    },
    performance: {
      completionRate: completionRate,
      avgCompletionDays: Number(ss.avg_completion_days) || 0,
    },
    sla: {
      complianceRate: slaComplianceRate,
      breached: sl.sla_breached || 0,
      atRisk: sl.sla_at_risk || 0,
      stuckWorkflows: sl.stuck_count || 0,
    },
    approvals: {
      pending: ap.pending_approvals || 0,
      stale: ap.stale_approvals || 0,
    },
    limits: WORKFLOW_LIMITS,
    timeouts: WORKFLOW_TIMEOUTS,
  }, req));
}

export async function getWorkflowAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, taskStatusBreakdown, slaByType, agingReport, approvalBacklog] = await Promise.all([
    workflowQuery.getKpiMetrics(tenantId),
    workflowQuery.getWorkflowTypeBreakdown(tenantId),
    workflowQuery.getTaskStatusBreakdown(tenantId),
    workflowQuery.getSlaComplianceByType(tenantId),
    workflowQuery.getAgingReport(tenantId),
    workflowQuery.getApprovalBacklog(tenantId),
  ]);
  res.json(ok({
    kpis,
    typeBreakdown,
    taskStatusBreakdown,
    slaByType,
    agingReport,
    approvalBacklog,
  }, req));
}

export async function getStuckWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const staleAfterDays = req.query.staleAfterDays
    ? Number(req.query.staleAfterDays)
    : undefined;
  const stuck = await workflowQuery.getStuckWorkflows(tenantId, staleAfterDays);
  res.json(ok({
    stuckWorkflows: stuck,
    total: stuck.length,
    staleThresholdDays: staleAfterDays ?? WORKFLOW_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS,
    overdueCount: stuck.filter(w => w.isOverdue).length,
  }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'workflow', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'workflow', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
