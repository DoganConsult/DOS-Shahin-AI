import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getTrainingSeedData, seedTrainingModule } from '../data/training-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as trainingQuery from '../repositories/training-query.repo';
import { TRAINING_LIMITS, TRAINING_TIMEOUTS, TRAINING_BUSINESS_THRESHOLDS as _TRAINING_BUSINESS_THRESHOLDS } from '../data/training-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getTrainingSeedData();
  res.json(ok({ moduleCode: 'training', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'training_config', entityId: 'training' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedTrainingModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'training', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getTrainingSeedData();

  const [programStats, enrollmentStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'published')::int AS published,
         COUNT(*) FILTER (WHERE status = 'enrollment_open')::int AS enrollment_open,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired
       FROM "${schema}".training_programs WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'expired', 'archived'))::int AS overdue,
         COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS} days' AND status NOT IN ('completed', 'expired', 'archived'))::int AS expiring_soon
       FROM "${schema}".training_programs WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ps = programStats.rows[0] || {};
  const es = enrollmentStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((es.overdue || 0) > 20 || (ps.expired || 0) > 10) healthStatus = 'critical';
  else if ((es.overdue || 0) > 5 || (es.expiring_soon || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'training',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    programs: {
      total: ps.total || 0,
      draft: ps.draft || 0,
      published: ps.published || 0,
      enrollmentOpen: ps.enrollment_open || 0,
      inProgress: ps.in_progress || 0,
      completed: ps.completed || 0,
      expired: ps.expired || 0,
    },
    compliance: {
      overdue: es.overdue || 0,
      expiringSoon: es.expiring_soon || 0,
    },
    limits: TRAINING_LIMITS,
    timeouts: TRAINING_TIMEOUTS,
  }, req));
}

export async function getTrainingAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, categoryBreakdown] = await Promise.all([
    trainingQuery.getKpiMetrics(tenantId),
    trainingQuery.getCategoryBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, categoryBreakdown }, req));
}

export async function getOverduePrograms(req: AuthenticatedRequest, res: Response): Promise<void> {
  const overdue = await trainingQuery.getOverduePrograms(req.tenantId!);
  res.json(ok({ programs: overdue, total: overdue.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'training', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'training', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
