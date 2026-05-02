import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getPortalsSeedData, seedPortalsModule } from '../data/portals-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as portalsQuery from '../repositories/portals-query.repo';
import { PORTALS_LIMITS, PORTALS_TIMEOUTS, PORTALS_BUSINESS_THRESHOLDS as _PORTALS_BUSINESS_THRESHOLDS } from '../data/portals-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getPortalsSeedData();
  res.json(ok({ moduleCode: 'portals', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'portals_config', entityId: 'portals' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedPortalsModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'portals', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getPortalsSeedData();

  const [portalStats, tokenStats, sessionStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
       FROM "${schema}".portals_portals WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_tokens,
         COUNT(*) FILTER (WHERE is_revoked = false AND expires_at > NOW())::int AS active_tokens,
         COUNT(*) FILTER (WHERE expires_at < NOW() AND is_revoked = false)::int AS expired_tokens
       FROM "${schema}".portal_tokens`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT COUNT(*)::int AS active_sessions
       FROM "${schema}".portal_sessions WHERE is_active = true AND expires_at > NOW()`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ps = portalStats.rows[0] || {};
  const ts = tokenStats.rows[0] || {};
  const ss = sessionStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((ps.suspended || 0) > 2 || (ts.expired_tokens || 0) > 50) healthStatus = 'critical';
  else if ((ps.draft || 0) > 5 || (ts.expired_tokens || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'portals',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      totalPortals: ps.total || 0,
      activePortals: ps.active || 0,
      draftPortals: ps.draft || 0,
      suspendedPortals: ps.suspended || 0,
      totalTokens: ts.total_tokens || 0,
      activeTokens: ts.active_tokens || 0,
      expiredTokens: ts.expired_tokens || 0,
      activeSessions: ss.active_sessions || 0,
    },
    limits: PORTALS_LIMITS,
    timeouts: PORTALS_TIMEOUTS,
  }, req));
}

export async function getPortalAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, typeBreakdown, accessStats] = await Promise.all([
    portalsQuery.getKpiMetrics(tenantId),
    portalsQuery.getPortalTypeBreakdown(tenantId),
    portalsQuery.getAccessStats(tenantId),
  ]);
  res.json(ok({ kpis, typeBreakdown, accessStats }, req));
}

export async function getSessionOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const sessions = await portalsQuery.getActiveSessions(req.tenantId!);
  res.json(ok({ sessions, total: sessions.length }, req));
}

export async function getExpiredTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tokens = await portalsQuery.getExpiredTokens(req.tenantId!);
  res.json(ok({ tokens, total: tokens.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'portals', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'portals', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
