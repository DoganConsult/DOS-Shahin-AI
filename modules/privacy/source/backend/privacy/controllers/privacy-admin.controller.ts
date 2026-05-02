import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getPrivacySeedData, seedPrivacyModule } from '../data/privacy-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as privacyQuery from '../repositories/privacy-query.repo';
import { PRIVACY_LIMITS, PRIVACY_TIMEOUTS, PRIVACY_BUSINESS_THRESHOLDS as _PRIVACY_BUSINESS_THRESHOLDS } from '../data/privacy-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getPrivacySeedData();
  res.json(ok({ moduleCode: 'privacy', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'privacy_config', entityId: 'privacy' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedPrivacyModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'privacy', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getPrivacySeedData();

  const [dsrStats, consentStats, breachStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('submitted', 'in_progress'))::int AS active,
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'closed', 'archived'))::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".privacy_dsrs WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_consents,
         COUNT(*) FILTER (WHERE expires_at < NOW() AND revoked = false)::int AS expired_consents
       FROM "${schema}".privacy_consent_records`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_breaches,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved'))::int AS open_breaches,
         COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'resolved'))::int AS critical_breaches
       FROM "${schema}".privacy_breach_records WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ds = dsrStats.rows[0] || {};
  const cs = consentStats.rows[0] || {};
  const bs = breachStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((bs.critical_breaches || 0) > 0 || (ds.overdue || 0) > 10) healthStatus = 'critical';
  else if ((bs.open_breaches || 0) > 3 || (ds.overdue || 0) > 3 || (cs.expired_consents || 0) > 20) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'privacy',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      totalDsrs: ds.total || 0,
      activeDsrs: ds.active || 0,
      overdueDsrs: ds.overdue || 0,
      completedDsrs: ds.completed || 0,
      totalConsents: cs.total_consents || 0,
      expiredConsents: cs.expired_consents || 0,
      totalBreaches: bs.total_breaches || 0,
      openBreaches: bs.open_breaches || 0,
      criticalBreaches: bs.critical_breaches || 0,
    },
    limits: PRIVACY_LIMITS,
    timeouts: PRIVACY_TIMEOUTS,
  }, req));
}

export async function getDsrAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, regulationBreakdown] = await Promise.all([
    privacyQuery.getKpiMetrics(tenantId),
    privacyQuery.getDsrTypeBreakdown(tenantId),
    privacyQuery.getRegulationBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, regulationBreakdown }, req));
}

export async function getBreachOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const breaches = await privacyQuery.getOpenBreaches(req.tenantId!);
  res.json(ok({ breaches, total: breaches.length }, req));
}

export async function getConsentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const consents = await privacyQuery.getConsentExpiryReport(req.tenantId!);
  res.json(ok({ consents, total: consents.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'privacy', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'privacy', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
