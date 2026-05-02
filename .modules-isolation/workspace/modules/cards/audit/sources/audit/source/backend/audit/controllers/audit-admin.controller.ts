import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getAuditSeedData, seedAuditModule } from '../data/audit-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as auditQuery from '../repositories/audit-query.repo';
import { AUDIT_LIMITS, AUDIT_TIMEOUTS, AUDIT_SLA_DEFAULTS } from '../data/audit-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getAuditSeedData();
  res.json(ok({ moduleCode: 'audit', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'audit_config', entityId: 'audit' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedAuditModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'audit', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getAuditSeedData();

  const [lifecycleStats, findingStats, overdueStats, slaStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
         COUNT(*) FILTER (WHERE status = 'fieldwork')::int AS fieldwork,
         COUNT(*) FILTER (WHERE status = 'draft_report')::int AS draft_report,
         COUNT(*) FILTER (WHERE status = 'review')::int AS review,
         COUNT(*) FILTER (WHERE status = 'final_report')::int AS final_report,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active
       FROM "${schema}".audit_audits WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_findings,
         COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'remediated'))::int AS critical_open,
         COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('closed', 'remediated'))::int AS high_open,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated'))::int AS open_findings,
         COUNT(*) FILTER (WHERE status IN ('closed', 'remediated'))::int AS closed_findings
       FROM "${schema}".findings WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT COUNT(*)::int AS overdue_audits
       FROM "${schema}".audit_audits
       WHERE deleted_at IS NULL
         AND status NOT IN ('closed', 'archived')
         AND end_date < NOW()`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'remediated')
           AND created_at < NOW() - INTERVAL '${AUDIT_SLA_DEFAULTS.critical} hours')::int AS critical_sla_breach,
         COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('closed', 'remediated')
           AND created_at < NOW() - INTERVAL '${AUDIT_SLA_DEFAULTS.high} hours')::int AS high_sla_breach
       FROM "${schema}".findings WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ls = lifecycleStats.rows[0] || {};
  const fs = findingStats.rows[0] || {};
  const os = overdueStats.rows[0] || {};
  const sl = slaStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((sl.critical_sla_breach || 0) > 0 || (fs.critical_open || 0) > 3) healthStatus = 'critical';
  else if ((sl.high_sla_breach || 0) > 0 || (os.overdue_audits || 0) > 2 || (fs.high_open || 0) > 5) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'audit',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    lifecycle: {
      total: ls.total || 0,
      active: ls.active || 0,
      planned: ls.planned || 0,
      fieldwork: ls.fieldwork || 0,
      draftReport: ls.draft_report || 0,
      review: ls.review || 0,
      finalReport: ls.final_report || 0,
      closed: ls.closed || 0,
      archived: ls.archived || 0,
    },
    findings: {
      total: fs.total_findings || 0,
      open: fs.open_findings || 0,
      closed: fs.closed_findings || 0,
      criticalOpen: fs.critical_open || 0,
      highOpen: fs.high_open || 0,
    },
    overdue: {
      audits: os.overdue_audits || 0,
      criticalFindingSlaBreach: sl.critical_sla_breach || 0,
      highFindingSlaBreach: sl.high_sla_breach || 0,
    },
    limits: AUDIT_LIMITS,
    timeouts: AUDIT_TIMEOUTS,
  }, req));
}

export async function getAuditAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, findingSeverityBreakdown, aging] = await Promise.all([
    auditQuery.getKpiMetrics(tenantId),
    auditQuery.getAuditTypeBreakdown(tenantId),
    auditQuery.getFindingSeverityBreakdown(tenantId),
    auditQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, findingSeverityBreakdown, aging }, req));
}

export async function getOpenFindings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
  const severity = req.query.severity as string | undefined;
  const auditId = req.query.auditId as string | undefined;
  const result = await auditQuery.getOpenFindings(tenantId, { page, pageSize, severity, auditId });
  res.json(ok({ findings: result.rows, total: result.total, page, pageSize }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'audit', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'audit', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
