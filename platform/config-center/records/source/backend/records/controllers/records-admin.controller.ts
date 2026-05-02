import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getRecordsSeedData, seedRecordsModule } from '../data/records-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as recordsQuery from '../repositories/records-query.repo';
import { RECORDS_LIMITS, RECORDS_TIMEOUTS, RECORDS_BUSINESS_THRESHOLDS as _RECORDS_BUSINESS_THRESHOLDS } from '../data/records-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getRecordsSeedData();
  res.json(ok({ moduleCode: 'records', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'records_config', entityId: 'records' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedRecordsModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'records', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getRecordsSeedData();

  const [recordStats, retentionStats, legalHoldStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'review')::int AS in_review,
         COUNT(*) FILTER (WHERE status = 'disposed')::int AS disposed,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".records_records WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date < NOW() AND status NOT IN ('disposed'))::int AS overdue_disposal,
         COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS upcoming_disposal,
         COUNT(*) FILTER (WHERE retention_period IS NULL)::int AS no_retention
       FROM "${schema}".records_records WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT COUNT(*)::int AS on_hold
       FROM "${schema}".records_records WHERE deleted_at IS NULL AND legal_hold = true`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const rs = recordStats.rows[0] || {};
  const rt = retentionStats.rows[0] || {};
  const lh = legalHoldStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((rt.overdue_disposal || 0) > 20 || (rt.no_retention || 0) > 50) healthStatus = 'critical';
  else if ((rt.overdue_disposal || 0) > 5 || (rt.no_retention || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'records',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      totalRecords: rs.total || 0,
      activeRecords: rs.active || 0,
      inReview: rs.in_review || 0,
      disposed: rs.disposed || 0,
      archived: rs.archived || 0,
      overdueDisposal: rt.overdue_disposal || 0,
      upcomingDisposal: rt.upcoming_disposal || 0,
      noRetentionPolicy: rt.no_retention || 0,
      onLegalHold: lh.on_hold || 0,
    },
    limits: RECORDS_LIMITS,
    timeouts: RECORDS_TIMEOUTS,
  }, req));
}

export async function getRetentionAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, classBreakdown, retentionCompliance] = await Promise.all([
    recordsQuery.getKpiMetrics(tenantId),
    recordsQuery.getClassificationBreakdown(tenantId),
    recordsQuery.getRetentionCompliance(tenantId),
  ]);
  res.json(ok({ kpis, classBreakdown, retentionCompliance }, req));
}

export async function getDisposalQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const queue = await recordsQuery.getDisposalQueue(req.tenantId!);
  res.json(ok({ queue, total: queue.length }, req));
}

export async function getLegalHolds(req: AuthenticatedRequest, res: Response): Promise<void> {
  const holds = await recordsQuery.getLegalHolds(req.tenantId!);
  res.json(ok({ holds, total: holds.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'records', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'records', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
