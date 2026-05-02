// ============================================
// Shahin -- Notification Rule Engine
// DB-driven notification rules: load, evaluate,
// resolve recipients, interpolate templates,
// and check user preferences
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import type {
  NotificationRule,
  NotificationRuleAction,
  ResolvedNotification,
  CachedRules,
} from './notification.types';

// === Notification Rule Cache (per-tenant, simple TTL) ===

const RULE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ruleCache = new Map<string, CachedRules>();

/**
 * Load notification rules from DB for a tenant.
 * Uses automation_rules table where module='notification' or actions contain notification config.
 * Falls back to empty array if table does not exist.
 */
export async function loadNotificationRules(tenantId: string): Promise<NotificationRule[]> {
  const cached = ruleCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < RULE_CACHE_TTL_MS) {
    return cached.rules;
  }

  const schema = tenantSchema(tenantId);
  const rules: NotificationRule[] = [];

  try {
    // Query automation_rules that have notification-related actions
    const result = await safeQuery(
      `SELECT rule_id, name, module, event, conditions, actions, enabled, priority
       FROM "${schema}".automation_rules
       WHERE enabled = TRUE
         AND deleted_at IS NULL
         AND (
           module = 'notification'
           OR actions::text LIKE '%notify%'
           OR actions::text LIKE '%notification%'
           OR actions::text LIKE '%send_notification%'
         )
       ORDER BY priority DESC, created_at ASC`,
      []
    );

    for (const row of result.rows) {
      const rawActions = Array.isArray(row.actions) ? row.actions : [];
      const notifActions: NotificationRuleAction[] = [];

      for (const action of rawActions) {
        // Accept actions that are notification-type actions
        if (
          action.type === 'send_notification' ||
          action.type === 'notify' ||
          action.notificationType
        ) {
          notifActions.push({
            notificationType: action.notificationType || action.notification_type || row.event,
            recipientStrategy: action.recipientStrategy || action.recipient_strategy || 'owner',
            recipientValue: action.recipientValue || action.recipient_value,
            channel: action.channel || 'in_app',
            template: action.template,
            titleTemplate: action.titleTemplate || action.title_template,
          });
        }
      }

      if (notifActions.length > 0) {
        rules.push({
          ruleId: row.rule_id,
          name: row.name,
          module: row.module,
          eventType: row.event,
          conditions: row.conditions || {},
          actions: notifActions,
          enabled: row.enabled,
          priority: row.priority || 0,
        });
      }
    }
  } catch (err: unknown) {
    // automation_rules table may not exist yet
    if (!toErrorMessage(err).includes('does not exist')) throw err;
  }

  ruleCache.set(tenantId, { rules, fetchedAt: Date.now() });
  return rules;
}

/**
 * Check user notification preferences to determine if a notification
 * should be delivered for a given activity type and module.
 * Returns the allowed channels, or null if the user has opted out entirely.
 */
export async function checkUserPreference(
  tenantId: string,
  userId: string,
  activityType: string,
  module: string
): Promise<{ enabled: boolean; channels: string[] } | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT enabled, channels
       FROM "${schema}".notification_preferences
       WHERE user_id = $1
         AND activity_type = $2
         AND module = $3
       LIMIT 1`,
      [userId, activityType, module]
    );

    if (result.rows.length === 0) {
      // No preference set -- default to enabled with in_app channel
      return { enabled: true, channels: ['in_app'] };
    }

    const pref = getFirstRow(result)!;
    return {
      enabled: pref.enabled,
      channels: pref.channels || ['in_app'],
    };
  } catch (err: unknown) {
    // notification_preferences table may not exist
    if (toErrorMessage(err).includes('does not exist')) {
      return { enabled: true, channels: ['in_app'] };
    }
    throw err;
  }
}

/**
 * Resolve notifications for a given event using DB-driven rules.
 * Falls back to hardcoded behavior when no matching rules are found.
 */
export async function resolveNotificationsFromRules(
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
): Promise<ResolvedNotification[]> {
  const rules = await loadNotificationRules(tenantId);
  const matchingRules = rules.filter(r => r.eventType === eventType);
  const notifications: ResolvedNotification[] = [];

  if (matchingRules.length === 0) {
    return []; // No DB rules found -- caller should use hardcoded fallback
  }

  const schema = tenantSchema(tenantId);

  for (const rule of matchingRules) {
    // Check conditions match the context
    if (!evaluateRuleConditions(rule.conditions, context)) {
      continue;
    }

    for (const action of rule.actions) {
      const recipientIds = await resolveRecipients(
        tenantId,
        schema,
        action.recipientStrategy,
        action.recipientValue,
        context
      );

      for (const recipientId of recipientIds) {
        // Check user preference before adding notification
        const pref = await checkUserPreference(
          tenantId,
          recipientId,
          action.notificationType,
          rule.module
        );
        if (!pref || !pref.enabled) {
          continue; // User opted out of this notification type
        }

        // Determine effective channel: intersection of rule channel and user preference
        const effectiveChannel = resolveChannel(action.channel, pref.channels);
        if (!effectiveChannel) {
          continue; // No overlapping channel
        }

        // Interpolate templates if provided
        const title = interpolateTemplate(
          action.titleTemplate || context.title || `${eventType} notification`,
          context
        );
        const body = interpolateTemplate(
          action.template || context.body || '',
          context
        );

        notifications.push({
          userId: recipientId,
          type: action.notificationType,
          title,
          body: body || undefined,
          link: context.link,
          channel: effectiveChannel,
        });
      }
    }
  }

  return notifications;
}

/**
 * Evaluate rule conditions against the event context.
 * Supports simple equality checks on context fields.
 */
export function evaluateRuleConditions(
  conditions: Record<string, unknown>,
  context: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions = always match
  }

  for (const [key, expected] of Object.entries(conditions)) {
    const actual = context[key] ?? context.extraData?.[key];
    if (actual === undefined) continue; // Skip any fields
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve recipient user IDs based on the recipient strategy.
 */
export async function resolveRecipients(
  tenantId: string,
  schema: string,
  strategy: NotificationRuleAction['recipientStrategy'],
  value: string | undefined,
  context: Record<string, unknown>
): Promise<string[]> {
  switch (strategy) {
    case 'owner':
      return context.ownerId ? [(context as any).ownerId] : [];
    case 'assignee':
      return context.assigneeId ? [(context as any).assigneeId] : [];
    case 'team': {
      const teamId = value || context.teamId;
      if (!teamId) return [];
      try {
        const result = await safeQuery(
          `SELECT user_id FROM "${schema}".team_members
           WHERE team_id = $1 AND active = TRUE`,
          [teamId]
        );
        return result.rows.map((r: GenericRow) => r.user_id);
      } catch {
        return [];
      }
    }
    case 'role': {
      if (!value) return [];
      try {
        // Look up users with the specified platform role
        const result = await safeQuery(
          `SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
           WHERE platform_role = $1 AND is_active = TRUE
             AND (valid_to IS NULL OR valid_to > NOW())`,
          [value]
        );
        return result.rows.map((r: GenericRow) => r.user_id);
      } catch {
        return [];
      }
    }
    case 'specific':
      return value ? [value] : [];
    default:
      return [];
  }
}

/**
 * Determine the effective delivery channel from rule and user preference.
 */
export function resolveChannel(
  ruleChannel: 'in_app' | 'email' | 'both' | 'slack' | 'teams',
  userChannels: string[]
): 'in_app' | 'email' | 'both' | 'slack' | 'teams' | null {
  if (ruleChannel === 'both') {
    const hasInApp = userChannels.includes('in_app');
    const hasEmail = userChannels.includes('email');
    if (hasInApp && hasEmail) return 'both';
    if (hasInApp) return 'in_app';
    if (hasEmail) return 'email';
    return null;
  }
  if (ruleChannel === 'slack' || ruleChannel === 'teams') {
    return ruleChannel;
  }
  if (userChannels.includes(ruleChannel)) {
    return ruleChannel;
  }
  return null;
}

/**
 * Simple template interpolation: replaces {{key}} with context values.
 */
export function interpolateTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context[key] ?? context.extraData?.[key] ?? `{{${key}}}`;
  });
}

/** Invalidate the rule cache for a tenant (call after rule CRUD) */
export function invalidateRuleCache(tenantId: string): void {
  ruleCache.delete(tenantId);
}
