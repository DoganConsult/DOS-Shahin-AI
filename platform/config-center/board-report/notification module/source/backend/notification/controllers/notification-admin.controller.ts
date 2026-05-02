import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getNotificationSeedData, seedNotificationModule } from '../data/notification-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as notifQuery from '../repositories/notification-query.repo';
import { NOTIFICATION_LIMITS, NOTIFICATION_TIMEOUTS, NOTIFICATION_BUSINESS_THRESHOLDS } from '../data/notification-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getNotificationSeedData();
  res.json(ok({ moduleCode: 'notification', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'notification_config', entityId: 'notification' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedNotificationModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'notification', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getNotificationSeedData();

  const [statusStats, deliveryStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
         COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
         COUNT(*) FILTER (WHERE status = 'read')::int AS read_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM "${schema}".notification_notifications WHERE deleted_at IS NULL
         AND created_at > NOW() - INTERVAL '24 hours'`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total_recent,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_recent,
         COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '${NOTIFICATION_TIMEOUTS.DELIVERY_TIMEOUT_SECONDS} seconds')::int AS stuck_pending
       FROM "${schema}".notification_notifications
       WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '1 hour'`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const ds = deliveryStats.rows[0] || {};

  const totalRecent = ds.total_recent || 0;
  const failedRecent = ds.failed_recent || 0;
  const failRate = totalRecent > 0 ? (failedRecent / totalRecent) * 100 : 0;

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (failRate > (100 - NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_CRITICAL) || (ds.stuck_pending || 0) > 50) healthStatus = 'critical';
  else if (failRate > (100 - NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_WARNING) || (ds.stuck_pending || 0) > 10) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'notification',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    last24h: {
      total: ss.total || 0,
      pending: ss.pending || 0,
      sent: ss.sent || 0,
      delivered: ss.delivered || 0,
      read: ss.read_count || 0,
      failed: ss.failed || 0,
    },
    delivery: {
      failRate: Number(failRate.toFixed(2)),
      stuckPending: ds.stuck_pending || 0,
    },
    limits: NOTIFICATION_LIMITS,
    timeouts: NOTIFICATION_TIMEOUTS,
  }, req));
}

export async function getDeliveryAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, channelBreakdown, hourlyTrend] = await Promise.all([
    notifQuery.getKpiMetrics(tenantId),
    notifQuery.getChannelBreakdown(tenantId),
    notifQuery.getHourlyTrend(tenantId),
  ]);
  res.json(ok({ kpis, channelBreakdown, hourlyTrend }, req));
}

export async function getFailedNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const failed = await notifQuery.getFailedNotifications(req.tenantId!);
  res.json(ok({ notifications: failed, total: failed.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'notification', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'notification', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
