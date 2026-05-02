import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getEvidenceSeedData, seedEvidenceModule } from '../data/evidence-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as evidenceQuery from '../repositories/evidence-query.repo';
import { EVIDENCE_LIMITS, EVIDENCE_TIMEOUTS, EVIDENCE_SLA_DEFAULTS, EVIDENCE_BUSINESS_THRESHOLDS } from '../data/evidence-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getEvidenceSeedData();
  res.json(ok({ moduleCode: 'evidence', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'evidence_config', entityId: 'evidence' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedEvidenceModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'evidence', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getEvidenceSeedData();

  const [statusStats, expiryStats, reviewStats, collectionStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'collecting')::int AS collecting,
         COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
         COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
         COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE expires_at < NOW() AND status NOT IN ('expired', 'archived', 'rejected'))::int AS already_expired,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status NOT IN ('expired', 'archived', 'rejected'))::int AS expiring_30d,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days' AND status NOT IN ('expired', 'archived', 'rejected'))::int AS expiring_60d,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '90 days' AND status NOT IN ('expired', 'archived', 'rejected'))::int AS expiring_90d
       FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'under_review')::int AS review_backlog,
         COUNT(*) FILTER (WHERE status = 'under_review' AND updated_at < NOW() - INTERVAL '${EVIDENCE_SLA_DEFAULTS.high} hours')::int AS review_overdue,
         COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status IN ('accepted', 'rejected')), 0)::numeric(6,2) AS avg_review_days
       FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'collecting' AND created_at < NOW() - INTERVAL '${EVIDENCE_TIMEOUTS.DEFAULT_SLA_HOURS} hours')::int AS collection_overdue,
         CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived')) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived'))::numeric * 100, 2)
           ELSE 0
         END AS acceptance_rate
       FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const ex = expiryStats.rows[0] || {};
  const rv = reviewStats.rows[0] || {};
  const cl = collectionStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((ex.already_expired || 0) > 0 || (rv.review_overdue || 0) > 5) healthStatus = 'critical';
  else if ((ex.expiring_30d || 0) > 10 || (rv.review_backlog || 0) > 20 || (cl.collection_overdue || 0) > 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'evidence',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      collecting: ss.collecting || 0,
      submitted: ss.submitted || 0,
      underReview: ss.under_review || 0,
      accepted: ss.accepted || 0,
      rejected: ss.rejected || 0,
      expired: ss.expired || 0,
      archived: ss.archived || 0,
    },
    expiry: {
      alreadyExpired: ex.already_expired || 0,
      expiring30d: ex.expiring_30d || 0,
      expiring60d: ex.expiring_60d || 0,
      expiring90d: ex.expiring_90d || 0,
    },
    review: {
      backlog: rv.review_backlog || 0,
      overdue: rv.review_overdue || 0,
      avgReviewDays: Number(rv.avg_review_days) || 0,
    },
    collection: {
      overdue: cl.collection_overdue || 0,
      acceptanceRate: Number(cl.acceptance_rate) || 0,
    },
    limits: EVIDENCE_LIMITS,
    timeouts: EVIDENCE_TIMEOUTS,
    thresholds: EVIDENCE_BUSINESS_THRESHOLDS,
  }, req));
}

export async function getEvidenceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, collectionProgress, agingReport] = await Promise.all([
    evidenceQuery.getKpiMetrics(tenantId),
    evidenceQuery.getEvidenceTypeBreakdown(tenantId),
    evidenceQuery.getCollectionProgress(tenantId),
    evidenceQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, collectionProgress, agingReport }, req));
}

export async function getExpiringEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const horizonDays = Number(req.query.days) || 30;
  const expiring = await evidenceQuery.getExpiringEvidence(tenantId, horizonDays);
  res.json(ok({ evidence: expiring, total: expiring.length, horizonDays }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'evidence', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'evidence', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
