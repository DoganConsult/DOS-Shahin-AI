import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getExceptionSeedData, seedExceptionModule } from '../data/exception-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as exceptionQuery from '../repositories/exception-query.repo';
import { EXCEPTION_LIMITS, EXCEPTION_TIMEOUTS, EXCEPTION_BUSINESS_THRESHOLDS } from '../data/exception-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getExceptionSeedData();
  res.json(ok({ moduleCode: 'exception', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'exception_config', entityId: 'exception' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedExceptionModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'exception', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getExceptionSeedData();

  const [statusStats, expiryStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'revoked')::int AS revoked
       FROM "${schema}".exceptions WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE expires_at < NOW() AND status NOT IN ('expired', 'revoked', 'closed', 'archived'))::int AS past_expiry,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_CRITICAL_DAYS} days' AND status = 'active')::int AS expiring_critical,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS} days' AND status = 'active')::int AS expiring_warning
       FROM "${schema}".exceptions WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const es = expiryStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((es.past_expiry || 0) > 0 || (es.expiring_critical || 0) > 5) healthStatus = 'critical';
  else if ((es.expiring_warning || 0) > 3 || (ss.pending || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'exception',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      active: ss.active || 0,
      pending: ss.pending || 0,
      approved: ss.approved || 0,
      expired: ss.expired || 0,
      revoked: ss.revoked || 0,
    },
    expiry: {
      pastExpiry: es.past_expiry || 0,
      expiringCritical: es.expiring_critical || 0,
      expiringWarning: es.expiring_warning || 0,
    },
    limits: EXCEPTION_LIMITS,
    timeouts: EXCEPTION_TIMEOUTS,
  }, req));
}

export async function getExpiryOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const exceptions = await exceptionQuery.getExpiringExceptions(req.tenantId!);
  res.json(ok({ exceptions, total: exceptions.length }, req));
}

export async function getRiskBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, riskBreakdown] = await Promise.all([
    exceptionQuery.getKpiMetrics(tenantId),
    exceptionQuery.getTypeBreakdown(tenantId),
    exceptionQuery.getRiskLevelBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, riskBreakdown }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'exception', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'exception', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
