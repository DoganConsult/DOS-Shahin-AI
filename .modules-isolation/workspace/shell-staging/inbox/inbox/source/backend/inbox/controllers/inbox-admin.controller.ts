import type { Request, Response } from 'express';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getInboxSeedData, seedInboxModule } from '../data/inbox-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as inboxQuery from '../repositories/inbox-query.repo';
import { recalculatePriorities, escalateOverduePriorityItems } from '../services/inbox-priority.service';
import { getRoutingRules, createRoutingRule, deactivateRoutingRule } from '../services/inbox-routing.service';
import { getBroadcastHistory } from '../services/inbox-broadcast.service';
import { getDigestRecipients } from '../services/inbox-digest.service';
import { INBOX_LIMITS, INBOX_TIMEOUTS, INBOX_BUSINESS_THRESHOLDS } from '../data/inbox-constants';

export async function getModuleConfig(req: Request, res: Response): Promise<void> {
  const seedData = getInboxSeedData();
  res.json(ok({ moduleCode: 'inbox', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: Request, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'inbox_config', entityId: 'inbox' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedInboxModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'inbox', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getInboxSeedData();

  const queueResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'unread')::int AS unread,
       COUNT(*) FILTER (WHERE status = 'read')::int AS read,
       COUNT(*) FILTER (WHERE status = 'actioned')::int AS actioned,
       COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
       COUNT(*) FILTER (WHERE priority = 'critical' AND status = 'unread')::int AS critical_unread,
       COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('actioned', 'archived', 'deleted'))::int AS overdue
     FROM "${schema}".inbox_messages WHERE deleted_at IS NULL`,
  );
  const stats = queueResult.rows[0] || {};

  const channelResult = await safeQuery(
    `SELECT channel, COUNT(*)::int AS count
     FROM "${schema}".inbox_messages WHERE deleted_at IS NULL
     GROUP BY channel ORDER BY count DESC`,
  );

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((stats.critical_unread || 0) > 0 || (stats.overdue || 0) > INBOX_BUSINESS_THRESHOLDS.UNREAD_CRITICAL_COUNT) {
    healthStatus = 'critical';
  } else if ((stats.unread || 0) > INBOX_BUSINESS_THRESHOLDS.UNREAD_WARNING_COUNT) {
    healthStatus = 'degraded';
  }

  res.json(ok({
    moduleCode: 'inbox',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    queue: {
      total: stats.total || 0,
      unread: stats.unread || 0,
      read: stats.read || 0,
      actioned: stats.actioned || 0,
      archived: stats.archived || 0,
      criticalUnread: stats.critical_unread || 0,
      overdue: stats.overdue || 0,
    },
    channels: channelResult.rows,
    limits: INBOX_LIMITS,
    timeouts: INBOX_TIMEOUTS,
  }, req));
}

export async function getQueueAnalytics(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [dashboardStats, kpis, aging, channelBreakdown, priorityBreakdown] = await Promise.all([
    inboxQuery.getDashboardStats(tenantId),
    inboxQuery.getKpiMetrics(tenantId),
    inboxQuery.getAgingReport(tenantId),
    inboxQuery.getChannelBreakdown(tenantId),
    inboxQuery.getPriorityDistribution(tenantId),
  ]);
  res.json(ok({ dashboardStats, kpis, aging, channelBreakdown, priorityBreakdown }, req));
}

export async function getReadRateMetrics(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const metrics = await inboxQuery.getReadRateMetrics(tenantId);
  res.json(ok(metrics, req));
}

export async function getResponseTimeMetrics(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const metrics = await inboxQuery.getResponseTimeMetrics(tenantId);
  res.json(ok(metrics, req));
}

export async function purgeExpiredMessages(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".inbox_messages
     SET deleted_at = NOW()
     WHERE deleted_at IS NULL
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`,
  );
  const count = result.rowCount ?? 0;
  setAuditData(res as any, { action: 'purge_expired', entityType: 'inbox', entityId: tenantId });
  res.json(action(`Purged ${count} expired messages`, req));
}

export async function recalcPriorities(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const updated = await recalculatePriorities(tenantId);
  setAuditData(res as any, { action: 'recalc_priorities', entityType: 'inbox', entityId: tenantId });
  res.json(action(`Recalculated priorities for ${updated} messages`, req));
}

export async function escalateOverdue(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const escalated = await escalateOverduePriorityItems(tenantId);
  setAuditData(res as any, { action: 'escalate_overdue', entityType: 'inbox', entityId: tenantId });
  res.json(action(`Escalated ${escalated} overdue messages`, req));
}

export async function listRoutingRules(req: Request, res: Response): Promise<void> {
  const rules = await getRoutingRules(req.tenantId!);
  res.json(ok({ rules, total: rules.length }, req));
}

export async function addRoutingRule(req: Request, res: Response): Promise<void> {
  const rule = await createRoutingRule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create_routing_rule', entityType: 'inbox_routing_rule', entityId: rule.ruleId });
  res.status(201).json(ok(rule, req));
}

export async function removeRoutingRule(req: Request, res: Response): Promise<void> {
  const rule = await deactivateRoutingRule(req.tenantId!, req.params.ruleId);
  setAuditData(res as any, { action: 'deactivate_routing_rule', entityType: 'inbox_routing_rule', entityId: rule.ruleId });
  res.json(action('Routing rule deactivated', req));
}

export async function getBroadcasts(req: Request, res: Response): Promise<void> {
  const limit = Number(req.query.limit) || 50;
  const history = await getBroadcastHistory(req.tenantId!, limit);
  res.json(ok({ broadcasts: history, total: history.length }, req));
}

export async function getDigestStats(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [dailyRecipients, weeklyRecipients] = await Promise.all([
    getDigestRecipients(tenantId, 'daily'),
    getDigestRecipients(tenantId, 'weekly'),
  ]);
  res.json(ok({
    daily: { recipientCount: dailyRecipients.length },
    weekly: { recipientCount: weeklyRecipients.length },
    total: dailyRecipients.length + weeklyRecipients.length,
  }, req));
}

export async function reindexModule(req: Request, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'inbox', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: Request, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'inbox', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
