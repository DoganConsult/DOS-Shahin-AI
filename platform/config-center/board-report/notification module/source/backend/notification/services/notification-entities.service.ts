/**
 * Notification Module — Entity Service Bridge
 * Delegates to NotificationEntitiesRepository and emits domain events for mutations.
 * Tables: notifications, notification_templates, notification_channels,
 *   notification_preferences, notification_rules, notification_batches,
 *   notification_subscriptions, email_templates, mobile_push_tokens,
 *   push_tokens, notifications_log.
 */

import { NotificationEntitiesRepository } from '../repositories/notification-entities.repo';
import { emitEvent } from '../ports/events.port';
import { safeQuery } from "@dos/db";

const MODULE = 'notification';

function emit(tenantId: string, entityType: string, event: string, result?: Record<string, unknown> | null) {
  if (result) {
    emitEvent(({ tenantId, userId: 'system', module: MODULE, event, entityType, entityId: result.id as string, data: result } as any));
  }
}

// ── notifications ───────────────────────────────────────────────────────

export async function listNotifications(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllNotifications(page, pageSize);
}
export async function getNotificationById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findNotificationById(id);
}
export async function createNotification(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createNotification(data);
  emit(tenantId, 'notification', 'created', result);
  return result;
}

// ── notification_templates ──────────────────────────────────────────────

export async function listTemplates(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllTemplates(page, pageSize);
}
export async function getTemplateById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findTemplateById(id);
}
export async function createTemplate(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createTemplate(data);
  emit(tenantId, 'notification_template', 'created', result);
  return result;
}

// ── notification_channels ───────────────────────────────────────────────

export async function listChannels(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllChannels(page, pageSize);
}
export async function getChannelById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findChannelById(id);
}
export async function createChannel(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createChannel(data);
  emit(tenantId, 'notification_channel', 'created', result);
  return result;
}

// ── notification_preferences ────────────────────────────────────────────

export async function listPreferences(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllPreferences(page, pageSize);
}
export async function getPreferenceById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findPreferenceById(id);
}
export async function createPreference(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createPreference(data);
  emit(tenantId, 'notification_preference', 'created', result);
  return result;
}

// ── notification_rules ──────────────────────────────────────────────────

export async function listRules(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllRules(page, pageSize);
}
export async function getRuleById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findRuleById(id);
}
export async function createRule(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createRule(data);
  emit(tenantId, 'notification_rule', 'created', result);
  return result;
}

// ── notification_batches ────────────────────────────────────────────────

export async function listBatches(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllBatches(page, pageSize);
}
export async function getBatchById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findBatchById(id);
}
export async function createBatch(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createBatch(data);
  emit(tenantId, 'notification_batch', 'created', result);
  return result;
}

// ── notification_subscriptions ──────────────────────────────────────────

export async function listSubscriptions(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllSubscriptions(page, pageSize);
}
export async function getSubscriptionById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findSubscriptionById(id);
}
export async function createSubscription(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createSubscription(data);
  emit(tenantId, 'notification_subscription', 'created', result);
  return result;
}

// ── email_templates ─────────────────────────────────────────────────────

export async function listEmailTemplates(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllEmailTemplates(page, pageSize);
}
export async function getEmailTemplateById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findEmailTemplateById(id);
}
export async function createEmailTemplate(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createEmailTemplate(data);
  emit(tenantId, 'email_template', 'created', result);
  return result;
}

// ── mobile_push_tokens ──────────────────────────────────────────────────

export async function listMobilePushTokens(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllMobilePushTokens(page, pageSize);
}
export async function getMobilePushTokenById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findMobilePushTokenById(id);
}
export async function createMobilePushToken(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createMobilePushToken(data);
  emit(tenantId, 'mobile_push_token', 'created', result);
  return result;
}

// ── push_tokens ─────────────────────────────────────────────────────────

export async function listPushTokens(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findAllPushTokens(page, pageSize);
}
export async function getPushTokenById(tenantId: string, id: string): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).findPushTokenById(id);
}
export async function createPushToken(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).createPushToken(data);
  emit(tenantId, 'push_token', 'created', result);
  return result;
}

// ── notifications_log ───────────────────────────────────────────────────

export async function listNotificationLog(tenantId: string, page?: number, pageSize?: number): Promise<unknown> {
  return new NotificationEntitiesRepository(tenantId).listNotificationLog(page, pageSize);
}
export async function createNotificationLog(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  const result = await new NotificationEntitiesRepository(tenantId).insertNotificationLog(data);
  emit(tenantId, 'notification_log', 'created', result);
  return result;
}
