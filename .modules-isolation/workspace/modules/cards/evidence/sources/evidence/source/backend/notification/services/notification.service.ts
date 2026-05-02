import { logger } from '../ports/logger.port';
// ============================================
// Shahin -- Notification Service
// In-app notification CRUD: create, list,
// mark read, mark all read, delete
// DB-driven notification rules with user preference opt-out
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

import { pushToUser } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// Re-export types so callers importing from this file don't break
export type {
  NotificationInput,
  Notification,
  NotificationRule,
  NotificationRuleAction,
  ResolvedNotification,
  CachedRules,
  TriggerNotification,
} from './notification.types';

// Re-export rule engine functions so callers importing from this file don't break.
// Note: interpolateTemplate is intentionally omitted to avoid barrel conflict
// with policy-template.service; import directly from notification-rule-engine if needed.
export {
  loadNotificationRules,
  checkUserPreference,
  resolveNotificationsFromRules,
  evaluateRuleConditions,
  resolveRecipients,
  resolveChannel,
  invalidateRuleCache,
} from './notification-rule-engine';

// Re-export deadline checks so callers importing from this file don't break
export { checkDeadlineNotifications } from './notification-deadline-checks';

// Import types and rule engine functions for local use
import type { NotificationInput, Notification, ResolvedNotification } from './notification.types';

import {
  resolveNotificationsFromRules,
  checkUserPreference,
} from './notification-rule-engine';

// === Pure notification trigger builders (DB-driven with hardcoded fallback) ===

/**
 * Property 2: Risk score change -> notify owner.
 * Tries DB-driven rules first; falls back to hardcoded behavior.
 */
export function buildRiskScoreChangeNotifications(
  ownerId: string,
  oldScore: number,
  newScore: number
): { userId: string; type: string; title?: string }[] {
  if (oldScore === newScore) return [];
  // Synchronous fallback; async DB-driven path is via dispatchEventNotifications()
  return [{ userId: ownerId, type: 'risk_score_change' }];
}

/**
 * Async DB-driven risk score change notification.
 * Queries rules, respects user preferences, falls back to hardcoded.
 */
export async function dispatchRiskScoreChangeNotifications(
  tenantId: string,
  ownerId: string,
  oldScore: number,
  newScore: number,
  context?: { riskId?: string; riskTitle?: string }
): Promise<ResolvedNotification[]> {
  if (oldScore === newScore) return [];

  const resolved = await resolveNotificationsFromRules(tenantId, 'risk_score_change', {
    module: 'risk',
    ownerId,
    title: context?.riskTitle
      ? `Risk score changed: ${context.riskTitle} (${oldScore} -> ${newScore})`
      : `Risk score changed from ${oldScore} to ${newScore}`,
    body: `The risk score has changed from ${oldScore} to ${newScore}. Please review.`,
    link: context?.riskId ? `/risks/${context.riskId}` : undefined,
    extraData: { oldScore, newScore, riskId: context?.riskId },
  });

  // Fallback to hardcoded if no DB rules matched
  if (resolved.length === 0) {
    // Check user preference even for hardcoded path
    const pref = await checkUserPreference(tenantId, ownerId, 'risk_score_change', 'risk');
    if (pref && pref.enabled) {
      return [{
        userId: ownerId,
        type: 'risk_score_change',
        title: context?.riskTitle
          ? `Risk score changed: ${context.riskTitle} (${oldScore} -> ${newScore})`
          : `Risk score changed from ${oldScore} to ${newScore}`,
        channel: 'in_app',
      }];
    }
    return [];
  }

  return resolved;
}

/**
 * Property 13: Critical incident -> notify all admins.
 * Returns one notification per admin when severity is 'critical'.
 */
export function buildCriticalIncidentNotifications(
  adminIds: string[],
  severity: string
): { userId: string; type: string; title?: string }[] {
  if (severity !== 'critical') return [];
  return adminIds.map(id => ({ userId: id, type: 'critical_incident' }));
}

/**
 * Property 4: Policy approval request -> notify approvers.
 * Tries DB-driven rules first; falls back to hardcoded behavior.
 */
export function buildPolicyApprovalNotifications(
  approverId: string,
  policyTitle: string
): { userId: string; type: string; title?: string }[] {
  // Synchronous fallback; async DB-driven path is via dispatchEventNotifications()
  return [{ userId: approverId, type: 'approval_request', title: `Approve: ${policyTitle}` }];
}

/**
 * Async DB-driven policy approval notification.
 * Queries rules, respects user preferences, falls back to hardcoded.
 */
export async function dispatchPolicyApprovalNotifications(
  tenantId: string,
  approverId: string,
  policyTitle: string,
  context?: { policyId?: string }
): Promise<ResolvedNotification[]> {
  const resolved = await resolveNotificationsFromRules(tenantId, 'policy_approval_request', {
    module: 'policy',
    assigneeId: approverId,
    title: `Approve: ${policyTitle}`,
    body: `Policy "${policyTitle}" requires your approval.`,
    link: context?.policyId ? `/policies/${context.policyId}` : undefined,
    extraData: { policyTitle, policyId: context?.policyId },
  });

  // Fallback to hardcoded if no DB rules matched
  if (resolved.length === 0) {
    const pref = await checkUserPreference(tenantId, approverId, 'approval_request', 'policy');
    if (pref && pref.enabled) {
      return [{
        userId: approverId,
        type: 'approval_request',
        title: `Approve: ${policyTitle}`,
        body: `Policy "${policyTitle}" requires your approval.`,
        link: context?.policyId ? `/policies/${context.policyId}` : undefined,
        channel: 'in_app',
      }];
    }
    return [];
  }

  return resolved;
}

/**
 * Property 5: Deadline within 7 days -> notify assignee.
 * Tries DB-driven rules first; falls back to hardcoded behavior.
 */
export function buildDeadlineNotification(
  daysUntilDeadline: number,
  assigneeId: string
): { userId: string; type: string; title?: string }[] {
  if (daysUntilDeadline > 7) return [];
  // Synchronous fallback; async DB-driven path is via dispatchEventNotifications()
  return [{ userId: assigneeId, type: 'deadline_reminder' }];
}

/**
 * Async DB-driven deadline reminder notification.
 * Queries rules, respects user preferences, falls back to hardcoded.
 */
export async function dispatchDeadlineNotifications(
  tenantId: string,
  assigneeId: string,
  daysUntilDeadline: number,
  context?: { entityType?: string; entityId?: string; entityTitle?: string; dueDate?: string }
): Promise<ResolvedNotification[]> {
  if (daysUntilDeadline > 7) return [];

  const resolved = await resolveNotificationsFromRules(tenantId, 'deadline_reminder', {
    module: context?.entityType || 'general',
    assigneeId,
    title: context?.entityTitle
      ? `Deadline approaching: ${context.entityTitle} (${daysUntilDeadline} days)`
      : `Deadline in ${daysUntilDeadline} days`,
    body: context?.dueDate
      ? `Due on ${context.dueDate}. Please ensure timely completion.`
      : `Deadline in ${daysUntilDeadline} days. Please ensure timely completion.`,
    link: context?.entityId ? `/${context.entityType || 'tasks'}/${context.entityId}` : undefined,
    extraData: { daysUntilDeadline, dueDate: context?.dueDate },
  });

  // Fallback to hardcoded if no DB rules matched
  if (resolved.length === 0) {
    const pref = await checkUserPreference(tenantId, assigneeId, 'deadline_reminder', context?.entityType || 'general');
    if (pref && pref.enabled) {
      return [{
        userId: assigneeId,
        type: 'deadline_reminder',
        title: context?.entityTitle
          ? `Deadline approaching: ${context.entityTitle} (${daysUntilDeadline} days)`
          : `Deadline in ${daysUntilDeadline} days`,
        channel: 'in_app',
      }];
    }
    return [];
  }

  return resolved;
}

/**
 * Generic DB-driven event notification dispatcher.
 * Use this as the primary entry point for all event-based notifications.
 * Loads rules for the event type, resolves recipients, checks preferences,
 * and dispatches via createNotification() + optional notification_queue.
 */
export async function dispatchEventNotifications(
  tenantId: string,
  eventType: string,
  context: {
    module?: string;
    ownerId?: string;
    assigneeId?: string;
    teamId?: string;
    entityType?: string;
    entityId?: string;
    title?: string;
    body?: string;
    link?: string;
    extraData?: Record<string, unknown>;
  }
): Promise<number> {
  const resolved = await resolveNotificationsFromRules(tenantId, eventType, context);
  let dispatched = 0;

  for (const notif of resolved) {
    try {
      // Always create in-app notification
      if (notif.channel === 'in_app' || notif.channel === 'both') {
        await createNotification(tenantId, {
          userId: notif.userId,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          link: notif.link,
        });
        dispatched++;
      }

      // Queue email notification via notification_queue if channel includes email
      if (notif.channel === 'email' || notif.channel === 'both') {
        await queueEmailNotification(tenantId, notif);
        dispatched++;
      }

      if (notif.channel === 'slack') {
        try {
          const { resolveSlackConfig } = await import('../../integrations/services/integration-config-resolver.service.js');
          const slackCfg = await resolveSlackConfig(tenantId);
          if (slackCfg?.webhookUrl) {
            const { sendSlackNotification } = await import('../../../connectors/slack-adapter.js');
            await sendSlackNotification(slackCfg.webhookUrl, { text: `${notif.title}\n${notif.body || ''}`, blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `*${notif.title}*\n${notif.body || ''}` } }] });
            dispatched++;
          }
        } catch (slackErr: unknown) {
          logger.warn(`[NotificationService] Slack dispatch failed: ${toErrorMessage(slackErr)}`);
        }
      }

      if (notif.channel === 'teams') {
        try {
          const { resolveTeamsConfig } = await import('../../integrations/services/integration-config-resolver.service.js');
          const teamsCfg = await resolveTeamsConfig(tenantId);
          if (teamsCfg?.webhookUrl) {
            const { sendTeamsNotification } = await import('../../../connectors/teams-adapter.js');
            await sendTeamsNotification(teamsCfg.webhookUrl, { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4', body: [{ type: 'TextBlock', text: notif.title, weight: 'Bolder' }, { type: 'TextBlock', text: notif.body || '', wrap: true }] } }] });
            dispatched++;
          }
        } catch (teamsErr: unknown) {
          logger.warn(`[NotificationService] Teams dispatch failed: ${toErrorMessage(teamsErr)}`);
        }
      }
    } catch (err: unknown) {
      logger.warn(`[NotificationService] Failed to dispatch ${notif.type} to ${notif.userId}: ${toErrorMessage(err)}`);
    }
  }

  return dispatched;
}

/**
 * Queue an email notification via the notification_queue table.
 * Non-fatal: logs warning on failure.
 */
async function queueEmailNotification(
  tenantId: string,
  notif: ResolvedNotification
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".notification_queue
       (recipient_id, notification_type, priority, subject, body, delivery_channel, status)
       VALUES ($1, $2, 'medium', $3, $4, 'email', 'pending')`,
      [notif.userId, notif.type, notif.title, notif.body || '']
    );
  } catch (err: unknown) {
    // notification_queue table may not exist yet
    if (!toErrorMessage(err).includes('does not exist')) {
      logger.warn(`[NotificationService] Failed to queue email for ${notif.userId}: ${toErrorMessage(err)}`);
    }
  }
}

// === Pure function for property testing ===

/**
 * Simulates marking a subset of notifications as read.
 * Returns a new array with `read = true` and `read_at` set to a
 * non-null timestamp for every notification whose id is in `notificationIds`.
 */
export function applyReadStatus(
  notifications: Array<{ read: boolean; read_at: string | null; notification_id?: string }>,
  notificationIds: string[]
): Array<{ read: boolean; read_at: string | null; notification_id?: string }> {
  const idSet = new Set(notificationIds);
  const now = new Date().toISOString();
  return notifications.map((n) => {
    if (n.notification_id && idSet.has(n.notification_id)) {
      return { ...n, read: true, read_at: n.read_at ?? now };
    }
    return { ...n };
  });
}

// === CRUD Operations ===

/**
 * Create a new in-app notification for a user.
 */
export async function createNotification(
  tenantId: string,
  data: NotificationInput
): Promise<Notification> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.notification_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Get all notifications for a user, ordered by most recent first.
 */
export async function getNotifications(
  tenantId: string,
  userId: string
): Promise<Notification[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as unknown as Notification[];
}

/**
 * Mark a single notification as read, setting read_at to NOW().
 */
export async function markAsRead(
  tenantId: string,
  notificationId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".notifications
     SET read = true, read_at = NOW()
     WHERE notification_id = $1`,
    [notificationId]
  );
}

/**
 * Mark all unread notifications as read for a given user.
 */
export async function markAllAsRead(
  tenantId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".notifications
     SET read = true, read_at = NOW()
     WHERE user_id = $1 AND read = false`,
    [userId]
  );
}

/**
 * Delete a notification by ID. Returns true if a row was deleted.
 */
export async function deleteNotification(
  tenantId: string,
  notificationId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".notifications
     WHERE notification_id = $1`,
    [notificationId]
  );
  return (result.rowCount ?? 0) > 0;
}
