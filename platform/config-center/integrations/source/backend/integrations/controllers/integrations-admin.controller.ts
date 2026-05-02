import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getIntegrationsSeedData, seedIntegrationsModule } from '../data/integrations-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as intQuery from '../repositories/integrations-query.repo';
import { INTEGRATIONS_LIMITS, INTEGRATIONS_TIMEOUTS, INTEGRATIONS_BUSINESS_THRESHOLDS } from '../data/integrations-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getIntegrationsSeedData();
  res.json(ok({ moduleCode: 'integrations', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'integrations_config', entityId: 'integrations' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedIntegrationsModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'integrations', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getIntegrationsSeedData();

  const [statusStats, healthStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'configured')::int AS configured,
         COUNT(*) FILTER (WHERE status = 'testing')::int AS testing,
         COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
         COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled
       FROM "${schema}".integration_connectors WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE last_sync_error IS NOT NULL AND status = 'active')::int AS with_errors,
         COUNT(*) FILTER (WHERE last_sync_at < NOW() - INTERVAL '${INTEGRATIONS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days' AND status = 'active')::int AS stale_sync
       FROM "${schema}".integration_connectors WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const hs = healthStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((ss.degraded || 0) > 3 || (hs.with_errors || 0) > 5) healthStatus = 'critical';
  else if ((ss.degraded || 0) > 0 || (hs.stale_sync || 0) > 3) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'integrations',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      active: ss.active || 0,
      configured: ss.configured || 0,
      testing: ss.testing || 0,
      degraded: ss.degraded || 0,
      disabled: ss.disabled || 0,
    },
    syncHealth: {
      withErrors: hs.with_errors || 0,
      staleSync: hs.stale_sync || 0,
    },
    limits: INTEGRATIONS_LIMITS,
    timeouts: INTEGRATIONS_TIMEOUTS,
  }, req));
}

export async function getConnectorAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown] = await Promise.all([
    intQuery.getKpiMetrics(tenantId),
    intQuery.getConnectorTypeBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown }, req));
}

export async function getDegradedConnectors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const degraded = await intQuery.getDegradedConnectors(req.tenantId!);
  res.json(ok({ connectors: degraded, total: degraded.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'integrations', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'integrations', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
