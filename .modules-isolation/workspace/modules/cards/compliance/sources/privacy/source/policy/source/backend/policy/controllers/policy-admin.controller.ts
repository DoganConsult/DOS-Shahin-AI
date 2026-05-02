import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getPolicySeedData, seedPolicyModule } from '../data/policy-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as policyQuery from '../repositories/policy-query.repo';
import { POLICY_LIMITS, POLICY_TIMEOUTS, POLICY_BUSINESS_THRESHOLDS } from '../data/policy-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getPolicySeedData();
  res.json(ok({ moduleCode: 'policy', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'policy_config', entityId: 'policy' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedPolicyModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'policy', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getPolicySeedData();

  const [statusStats, reviewStats, versionStats] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'in_review')::int AS in_review,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'effective')::int AS effective,
        COUNT(*) FILTER (WHERE status = 'under_revision')::int AS under_revision,
        COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
      FROM "${schema}".policy_policies WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COUNT(*) FILTER (
          WHERE review_date IS NOT NULL AND review_date < NOW() AND status NOT IN ('deprecated', 'archived')
        )::int AS overdue_review,
        COUNT(*) FILTER (
          WHERE review_date IS NOT NULL
            AND review_date >= NOW()
            AND review_date <= NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days'
            AND status NOT IN ('deprecated', 'archived')
        )::int AS due_soon,
        COUNT(*) FILTER (WHERE review_date IS NULL AND status NOT IN ('deprecated', 'archived'))::int AS no_review_date
      FROM "${schema}".policy_policies WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COUNT(*)::int AS stale_effective,
        COALESCE(AVG(version) FILTER (WHERE status IN ('approved', 'published', 'effective')), 1)::numeric(5,2) AS avg_version
      FROM "${schema}".policy_policies
      WHERE deleted_at IS NULL
        AND status IN ('approved', 'published', 'effective')
        AND updated_at < NOW() - INTERVAL '${POLICY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'
    `).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const rs = reviewStats.rows[0] || {};
  const vs = versionStats.rows[0] || {};

  const overdueReview = rs.overdue_review || 0;
  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (overdueReview >= POLICY_BUSINESS_THRESHOLDS.OVERDUE_REVIEW_CRITICAL) healthStatus = 'critical';
  else if (overdueReview >= POLICY_BUSINESS_THRESHOLDS.OVERDUE_REVIEW_WARNING) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'policy',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      inReview: ss.in_review || 0,
      approved: ss.approved || 0,
      published: ss.published || 0,
      effective: ss.effective || 0,
      underRevision: ss.under_revision || 0,
      deprecated: ss.deprecated || 0,
      archived: ss.archived || 0,
    },
    reviewHealth: {
      overdueReview,
      dueSoon: rs.due_soon || 0,
      noReviewDate: rs.no_review_date || 0,
    },
    versionHealth: {
      staleEffectivePolicies: vs.stale_effective || 0,
      avgVersionNumber: Number(vs.avg_version) || 1,
    },
    limits: POLICY_LIMITS,
    timeouts: POLICY_TIMEOUTS,
  }, req));
}

export async function getPolicyAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, categoryBreakdown, reviewCycleCompliance] = await Promise.all([
    policyQuery.getKpiMetrics(tenantId),
    policyQuery.getPolicyTypeBreakdown(tenantId),
    policyQuery.getCategoryBreakdown(tenantId),
    policyQuery.getReviewCycleCompliance(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, categoryBreakdown, reviewCycleCompliance }, req));
}

export async function getOverduePolicies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const limit = Math.min(Number(req.query['limit']) || 50, 200);
  const overdue = await policyQuery.getOverduePolicies(tenantId, limit);
  res.json(ok({ policies: overdue, total: overdue.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'policy', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'policy', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
