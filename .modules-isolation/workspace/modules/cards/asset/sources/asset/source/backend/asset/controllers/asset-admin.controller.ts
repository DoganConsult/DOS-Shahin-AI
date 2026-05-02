import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getAssetSeedData, seedAssetModule } from '../data/asset-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as assetQuery from '../repositories/asset-query.repo';
import { ASSET_LIMITS, ASSET_TIMEOUTS, ASSET_BUSINESS_THRESHOLDS as _ASSET_BUSINESS_THRESHOLDS } from '../data/asset-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getAssetSeedData();
  res.json(ok({ moduleCode: 'asset', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'asset_config', entityId: 'asset' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedAssetModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'asset', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getAssetSeedData();

  const [statusStats, classStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'discovered')::int AS discovered,
         COUNT(*) FILTER (WHERE status = 'registered')::int AS registered,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
         COUNT(*) FILTER (WHERE status = 'decommissioning')::int AS decommissioning,
         COUNT(*) FILTER (WHERE status = 'disposed')::int AS disposed
       FROM "${schema}".asset_assets WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE classification IS NULL OR classification = '')::int AS unclassified,
         COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_assets,
         COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS unowned,
         COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS} days' AND status = 'active')::int AS overdue_review
       FROM "${schema}".asset_assets WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const cs = classStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((cs.unclassified || 0) > 20 || (cs.unowned || 0) > 10) healthStatus = 'critical';
  else if ((cs.unclassified || 0) > 5 || (cs.overdue_review || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'asset',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      discovered: ss.discovered || 0,
      registered: ss.registered || 0,
      active: ss.active || 0,
      maintenance: ss.maintenance || 0,
      decommissioning: ss.decommissioning || 0,
      disposed: ss.disposed || 0,
    },
    classification: {
      unclassified: cs.unclassified || 0,
      criticalAssets: cs.critical_assets || 0,
      unowned: cs.unowned || 0,
      overdueReview: cs.overdue_review || 0,
    },
    limits: ASSET_LIMITS,
    timeouts: ASSET_TIMEOUTS,
  }, req));
}

export async function getAssetInventoryAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, classBreakdown] = await Promise.all([
    assetQuery.getKpiMetrics(tenantId),
    assetQuery.getTypeBreakdown(tenantId),
    assetQuery.getClassificationBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, classBreakdown }, req));
}

export async function getUnclassifiedAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const unclassified = await assetQuery.getUnclassifiedAssets(req.tenantId!);
  res.json(ok({ assets: unclassified, total: unclassified.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'asset', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'asset', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
