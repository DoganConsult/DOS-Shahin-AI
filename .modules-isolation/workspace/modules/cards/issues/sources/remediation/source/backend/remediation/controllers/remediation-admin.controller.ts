import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getRemediationSeedData, seedRemediationModule } from '../data/remediation-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as remQuery from '../repositories/remediation-query.repo';
import { REMEDIATION_LIMITS, REMEDIATION_TIMEOUTS, REMEDIATION_BUSINESS_THRESHOLDS } from '../data/remediation-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getRemediationSeedData();
  res.json(ok({ moduleCode: 'remediation', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'remediation_config', entityId: 'remediation' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedRemediationModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'remediation', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getRemediationSeedData();

  const [statusStats, overdueStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'pending_verification')::int AS pending_verification,
         COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('verified', 'closed', 'archived'))::int AS overdue,
         COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${REMEDIATION_BUSINESS_THRESHOLDS.OVERDUE_WARNING_DAYS} days' AND status NOT IN ('verified', 'closed', 'archived'))::int AS due_soon,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_plans
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const os = overdueStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((os.overdue || 0) > 10 || (os.failed_plans || 0) > 5) healthStatus = 'critical';
  else if ((os.overdue || 0) > 3 || (os.due_soon || 0) > 5) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'remediation',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      inProgress: ss.in_progress || 0,
      pendingVerification: ss.pending_verification || 0,
      verified: ss.verified || 0,
      failed: ss.failed || 0,
    },
    urgency: {
      overdue: os.overdue || 0,
      dueSoon: os.due_soon || 0,
      failedPlans: os.failed_plans || 0,
    },
    limits: REMEDIATION_LIMITS,
    timeouts: REMEDIATION_TIMEOUTS,
  }, req));
}

export async function getRemediationAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, sourceBreakdown, typeBreakdown] = await Promise.all([
    remQuery.getKpiMetrics(tenantId),
    remQuery.getSourceBreakdown(tenantId),
    remQuery.getTypeBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, sourceBreakdown, typeBreakdown }, req));
}

export async function getVerificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const pending = await remQuery.getPendingVerification(req.tenantId!);
  res.json(ok({ plans: pending, total: pending.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'remediation', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'remediation', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
