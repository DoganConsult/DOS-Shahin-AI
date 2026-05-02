import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getVendorSeedData, seedVendorModule } from '../data/vendor-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as vendorQuery from '../repositories/vendor-query.repo';
import { VENDOR_LIMITS, VENDOR_TIMEOUTS, VENDOR_BUSINESS_THRESHOLDS } from '../data/vendor-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getVendorSeedData();
  res.json(ok({ moduleCode: 'vendor', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'vendor_config', entityId: 'vendor' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedVendorModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'vendor', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getVendorSeedData();

  const [statusStats, riskStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'prospect')::int AS prospect,
         COUNT(*) FILTER (WHERE status = 'onboarding')::int AS onboarding,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
         COUNT(*) FILTER (WHERE status = 'offboarding')::int AS offboarding,
         COUNT(*) FILTER (WHERE status = 'terminated')::int AS terminated,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".vendor_vendors WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE risk_rating = 'critical' AND status NOT IN ('terminated', 'archived'))::int AS critical_risk_active,
         COUNT(*) FILTER (WHERE risk_rating = 'high' AND status NOT IN ('terminated', 'archived'))::int AS high_risk_active,
         COUNT(*) FILTER (WHERE contract_end_date BETWEEN NOW() AND NOW() + INTERVAL '${VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS} days' AND status NOT IN ('terminated', 'archived'))::int AS contracts_expiring_soon,
         COUNT(*) FILTER (WHERE contract_end_date < NOW() AND status NOT IN ('terminated', 'archived'))::int AS contracts_expired,
         COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '365 days' AND status = 'active' AND risk_rating IN ('critical', 'high'))::int AS high_risk_overdue_reassessment
       FROM "${schema}".vendor_vendors WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const rs = riskStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((rs.critical_risk_active || 0) > 5 || (ss.suspended || 0) > 3 || (rs.high_risk_overdue_reassessment || 0) > 0) healthStatus = 'critical';
  else if ((rs.high_risk_active || 0) > VENDOR_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE / 10 || (rs.contracts_expiring_soon || 0) > 5 || (rs.contracts_expired || 0) > 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'vendor',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      prospect: ss.prospect || 0,
      onboarding: ss.onboarding || 0,
      active: ss.active || 0,
      underReview: ss.under_review || 0,
      suspended: ss.suspended || 0,
      offboarding: ss.offboarding || 0,
      terminated: ss.terminated || 0,
      archived: ss.archived || 0,
    },
    risk: {
      criticalRiskActive: rs.critical_risk_active || 0,
      highRiskActive: rs.high_risk_active || 0,
      contractsExpiringSoon: rs.contracts_expiring_soon || 0,
      contractsExpired: rs.contracts_expired || 0,
      highRiskOverdueReassessment: rs.high_risk_overdue_reassessment || 0,
    },
    limits: VENDOR_LIMITS,
    timeouts: VENDOR_TIMEOUTS,
  }, req));
}

export async function getVendorAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, riskRatingBreakdown, categoryBreakdown] = await Promise.all([
    vendorQuery.getKpiMetrics(tenantId),
    vendorQuery.getRiskRatingBreakdown(tenantId),
    vendorQuery.getCategoryBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, riskRatingBreakdown, categoryBreakdown }, req));
}

export async function getHighRiskVendors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const highRisk = await vendorQuery.getHighRiskVendors(req.tenantId!);
  res.json(ok({ vendors: highRisk, total: highRisk.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'vendor', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'vendor', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
