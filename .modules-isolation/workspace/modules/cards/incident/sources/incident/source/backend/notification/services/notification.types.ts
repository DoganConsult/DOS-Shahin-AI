import { safeQuery } from "@dos/db";

// ============================================
// Shahin -- Notification Type Definitions
// Shared interfaces for notification CRUD,
// DB-driven rules, and event dispatch
// ============================================

/** Input data for creating a new in-app notification */
export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  severity?: string;
}

/** A persisted notification row from the DB */
export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// === DB-Driven Notification Rule Types ===

/** A notification rule loaded from the automation_rules table */
export interface NotificationRule {
  ruleId: string;
  name: string;
  module: string;
  eventType: string;
  conditions: Record<string, unknown>;
  actions: NotificationRuleAction[];
  enabled: boolean;
  priority: number;
}

/** A single action within a notification rule */
export interface NotificationRuleAction {
  notificationType: string;
  recipientStrategy: 'owner' | 'assignee' | 'team' | 'role' | 'specific';
  recipientValue?: string; // role name, team_id, or specific user_id
  channel: 'in_app' | 'email' | 'both' | 'slack' | 'teams';
  template?: string;
  titleTemplate?: string;
}

/** Resolved notification ready to dispatch */
export interface ResolvedNotification {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  channel: 'in_app' | 'email' | 'both' | 'slack' | 'teams';
}

/** Per-tenant rule cache entry with TTL */
export interface CachedRules {
  rules: NotificationRule[];
  fetchedAt: number;
}

/** Pure trigger notification (synchronous builders) */
export interface TriggerNotification {
  userId: string;
  type: string;
  title?: string;
}
