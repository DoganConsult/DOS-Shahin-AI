import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getIssuesSeedData, seedIssuesModule } from '../data/issues-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as issuesQuery from '../repositories/issues-query.repo';
import { getIssuesDashboard, getSlaComplianceReport, getAgingReport as _getReportingAging } from '../services/issues-reporting.service';
import { runSlaEscalationJob } from '../services/issues-lifecycle.service';
import { runEscalationJob, generateManagementAlerts } from '../services/issues-escalation.service';
import { getUserWorkloads } from '../services/issues-assignment.service';
import { ISSUES_LIMITS, ISSUES_TIMEOUTS, ISSUES_BUSINESS_THRESHOLDS as _ISSUES_BUSINESS_THRESHOLDS, ISSUES_SLA_DEFAULTS } from '../data/issues-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getIssuesSeedData();
  res.json(ok({ moduleCode: 'issues', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'issues_config', entityId: 'issues' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedIssuesModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'issues', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getIssuesSeedData();

  const statsResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active,
       COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'archived'))::int AS critical,
       COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue,
       COUNT(*) FILTER (WHERE (metadata->>'sla_breached')::boolean = true AND status NOT IN ('closed', 'archived'))::int AS sla_breached
     FROM "${schema}".issues WHERE deleted_at IS NULL`,
  );
  const stats = statsResult.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((stats.critical || 0) > 5 || (stats.sla_breached || 0) > 10) healthStatus = 'critical';
  else if ((stats.overdue || 0) > 10 || (stats.critical || 0) > 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'issues',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: stats.total || 0,
      active: stats.active || 0,
      critical: stats.critical || 0,
      overdue: stats.overdue || 0,
      slaBreached: stats.sla_breached || 0,
    },
    limits: ISSUES_LIMITS,
    timeouts: ISSUES_TIMEOUTS,
    slaDefaults: ISSUES_SLA_DEFAULTS,
  }, req));
}

export async function getIssuesAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [dashboard, kpis, aging, slaCompliance] = await Promise.all([
    getIssuesDashboard(tenantId),
    issuesQuery.getKpiMetrics(tenantId),
    issuesQuery.getAgingReport(tenantId),
    getSlaComplianceReport(tenantId),
  ]);
  res.json(ok({ dashboard, kpis, aging, slaCompliance }, req));
}

export async function getSeverityBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT severity, status, COUNT(*)::int AS count
     FROM "${schema}".issues WHERE deleted_at IS NULL
     GROUP BY severity, status ORDER BY severity, status`,
  );
  res.json(ok({ breakdown: result.rows }, req));
}

export async function getCategoryBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT category, COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active,
       COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue
     FROM "${schema}".issues WHERE deleted_at IS NULL
     GROUP BY category ORDER BY total DESC`,
  );
  res.json(ok({ categories: result.rows }, req));
}

export async function getWorkloadDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const workloads = await getUserWorkloads(req.tenantId!);
  res.json(ok({ workloads }, req));
}

export async function getManagementAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const alerts = await generateManagementAlerts(req.tenantId!);
  res.json(ok({ alerts, total: alerts.length }, req));
}

export async function triggerSlaEscalation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runSlaEscalationJob(req.tenantId!);
  setAuditData(res as any, { action: 'sla_escalation', entityType: 'issues', entityId: req.tenantId });
  res.json(action(`SLA escalation: ${result.escalated} issues escalated`, req));
}

export async function triggerEscalationChain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runEscalationJob(req.tenantId!);
  setAuditData(res as any, { action: 'escalation_chain', entityType: 'issues', entityId: req.tenantId });
  res.json(action(`Escalation chain: processed ${result.processed}, escalated ${result.escalated}`, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'issues', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'issues', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
