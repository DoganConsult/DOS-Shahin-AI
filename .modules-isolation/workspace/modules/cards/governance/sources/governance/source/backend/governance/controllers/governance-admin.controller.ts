import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getGovernanceSeedData, seedGovernanceModule } from '../data/governance-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as governanceQuery from '../repositories/governance-query.repo';
import { GOVERNANCE_LIMITS, GOVERNANCE_TIMEOUTS, GOVERNANCE_BUSINESS_THRESHOLDS } from '../data/governance-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getGovernanceSeedData();
  res.json(ok({ moduleCode: 'governance', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'governance_config', entityId: 'governance' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedGovernanceModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'governance', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getGovernanceSeedData();

  const [frameworkStats, controlStats, maturityStats, assessmentStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".governance_frameworks WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_controls,
         COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
         COUNT(*) FILTER (WHERE implementation_status = 'partially_implemented')::int AS partial,
         COUNT(*) FILTER (WHERE implementation_status = 'not_implemented')::int AS not_implemented,
         COUNT(*) FILTER (WHERE implementation_status = 'not_applicable')::int AS not_applicable
       FROM "${schema}".governance_controls WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COALESCE(ROUND(AVG(maturity_score)::numeric, 2), 0) AS avg_maturity_score,
         COUNT(*) FILTER (WHERE maturity_level = 'initial')::int AS level_1,
         COUNT(*) FILTER (WHERE maturity_level = 'managed')::int AS level_2,
         COUNT(*) FILTER (WHERE maturity_level = 'defined')::int AS level_3,
         COUNT(*) FILTER (WHERE maturity_level = 'quantitatively_managed')::int AS level_4,
         COUNT(*) FILTER (WHERE maturity_level = 'optimizing')::int AS level_5
       FROM "${schema}".governance_maturity_assessments
       WHERE deleted_at IS NULL AND assessment_date = (
         SELECT MAX(a2.assessment_date) FROM "${schema}".governance_maturity_assessments a2
         WHERE a2.framework_id = governance_maturity_assessments.framework_id AND a2.deleted_at IS NULL
       )`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS overdue_assessments,
         COUNT(*) FILTER (WHERE next_review_date < NOW() AND status NOT IN ('completed', 'cancelled'))::int AS overdue_reviews
       FROM "${schema}".governance_maturity_assessments
       WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const fs = frameworkStats.rows[0] || {};
  const cs = controlStats.rows[0] || {};
  const ms = maturityStats.rows[0] || {};
  const as_ = assessmentStats.rows[0] || {};

  const totalControls = cs.total_controls || 0;
  const implemented = cs.implemented || 0;
  const controlCoverage = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;
  const avgMaturity = Number(ms.avg_maturity_score) || 0;

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (controlCoverage < GOVERNANCE_BUSINESS_THRESHOLDS.CRITICAL_PERCENTAGE || (as_.overdue_assessments || 0) > 5) {
    healthStatus = 'critical';
  } else if (controlCoverage < GOVERNANCE_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE || (as_.overdue_assessments || 0) > 0) {
    healthStatus = 'degraded';
  }

  res.json(ok({
    moduleCode: 'governance',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    frameworks: {
      total: fs.total || 0,
      draft: fs.draft || 0,
      underReview: fs.under_review || 0,
      approved: fs.approved || 0,
      active: fs.active || 0,
      deprecated: fs.deprecated || 0,
      archived: fs.archived || 0,
    },
    controls: {
      total: totalControls,
      implemented: implemented,
      partiallyImplemented: cs.partial || 0,
      notImplemented: cs.not_implemented || 0,
      notApplicable: cs.not_applicable || 0,
      coveragePercent: controlCoverage,
    },
    maturity: {
      avgScore: avgMaturity,
      level1Initial: ms.level_1 || 0,
      level2Managed: ms.level_2 || 0,
      level3Defined: ms.level_3 || 0,
      level4QuantitativelyManaged: ms.level_4 || 0,
      level5Optimizing: ms.level_5 || 0,
    },
    assessments: {
      overdueAssessments: as_.overdue_assessments || 0,
      overdueReviews: as_.overdue_reviews || 0,
    },
    limits: GOVERNANCE_LIMITS,
    timeouts: GOVERNANCE_TIMEOUTS,
  }, req));
}

export async function getGovernanceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, frameworkTypes, controlStatus, maturityBreakdown, agingReport] = await Promise.all([
    governanceQuery.getKpiMetrics(tenantId),
    governanceQuery.getFrameworkTypeBreakdown(tenantId),
    governanceQuery.getControlImplementationStatus(tenantId),
    governanceQuery.getMaturityScoreBreakdown(tenantId),
    governanceQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, frameworkTypes, controlStatus, maturityBreakdown, agingReport }, req));
}

export async function getControlGaps(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const frameworkId = req.query.frameworkId as string | undefined;
  const gaps = await governanceQuery.getControlGaps(tenantId, frameworkId);
  res.json(ok({ gaps, total: gaps.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'governance', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'governance', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
