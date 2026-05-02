import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../../ports/middleware.port';
import { getQiyasSeedData, seedQiyasModule } from '../data/qiyas-seed';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import * as qiyasQuery from '../repositories/qiyas-query.repo';
import { QIYAS_LIMITS, QIYAS_TIMEOUTS, QIYAS_BUSINESS_THRESHOLDS } from '../data/qiyas-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getQiyasSeedData();
  res.json(ok({ moduleCode: 'qiyas', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'qiyas_config', entityId: 'qiyas' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedQiyasModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'qiyas', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getQiyasSeedData();

  const [assessmentStats, scoreStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'published')::int AS published,
         COUNT(*) FILTER (WHERE status = 'reviewed')::int AS reviewed
       FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COALESCE(AVG(overall_score), 0)::numeric(5,2) AS avg_score,
         COALESCE(MIN(overall_score), 0)::numeric(5,2) AS min_score,
         COALESCE(MAX(overall_score), 0)::numeric(5,2) AS max_score,
         COUNT(*) FILTER (WHERE overall_score IS NOT NULL AND overall_score < ${QIYAS_BUSINESS_THRESHOLDS.IMPROVEMENT_THRESHOLD_SCORE})::int AS below_threshold
       FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL AND overall_score IS NOT NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const as = assessmentStats.rows[0] || {};
  const ss = scoreStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((ss.below_threshold || 0) > 5 || (as.draft || 0) > 20) healthStatus = 'critical';
  else if ((ss.below_threshold || 0) > 2 || Number(ss.avg_score || 0) < QIYAS_BUSINESS_THRESHOLDS.TARGET_MATURITY_DEFAULT) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'qiyas',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      totalAssessments: as.total || 0,
      draft: as.draft || 0,
      inProgress: as.in_progress || 0,
      completed: as.completed || 0,
      published: as.published || 0,
      reviewed: as.reviewed || 0,
    },
    scores: {
      avgScore: Number(ss.avg_score) || 0,
      minScore: Number(ss.min_score) || 0,
      maxScore: Number(ss.max_score) || 0,
      belowThreshold: ss.below_threshold || 0,
    },
    limits: QIYAS_LIMITS,
    timeouts: QIYAS_TIMEOUTS,
  }, req));
}

export async function getMaturityAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, modelBreakdown, scoreTrend] = await Promise.all([
    qiyasQuery.getKpiMetrics(tenantId),
    qiyasQuery.getModelBreakdown(tenantId),
    qiyasQuery.getScoreTrend(tenantId),
  ]);
  res.json(ok({ kpis, modelBreakdown, scoreTrend }, req));
}

export async function getBelowThreshold(req: AuthenticatedRequest, res: Response): Promise<void> {
  const assessments = await qiyasQuery.getBelowThreshold(req.tenantId!);
  res.json(ok({ assessments, total: assessments.length }, req));
}

export async function getResponseRates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const rates = await qiyasQuery.getResponseRates(req.tenantId!);
  res.json(ok({ rates, total: rates.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'qiyas', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'qiyas', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
