import { eventBus } from '../ports/events.port';
import type { NotificationStatus } from '@dos/types/notification';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type NotificationEntityType = 'notification' | 'template' | 'channel_config' | 'preference' | 'digest';
export type NotificationAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'retried'
  | 'template_created' | 'template_updated' | 'template_activated' | 'template_deactivated'
  | 'channel_configured' | 'channel_enabled' | 'channel_disabled' | 'channel_health_check'
  | 'preference_updated' | 'preference_reset'
  | 'digest_compiled' | 'digest_sent' | 'digest_failed'
  | 'bulk_sent' | 'bulk_failed'
  | 'exported'
  | 'escalated';

export interface NotificationEventOptions {
  tenantId: string;
  entityType: NotificationEntityType;
  entityId: string;
  action: NotificationAction;
  triggeredBy: string;
  previousState?: NotificationStatus;
  newState?: NotificationStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: NotificationAction): 'info' | 'warning' | 'critical' {
  if (act === 'failed' || act === 'bulk_failed' || act === 'digest_failed') return 'critical';
  if (act === 'bounced' || act === 'retried' || act === 'channel_disabled') return 'warning';
  return 'info';
}

export function emitNotificationEvent(opts: NotificationEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `notification.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'notification',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitNotificationStatusChange(
  tenantId: string, entityType: NotificationEntityType, entityId: string,
  previousState: NotificationStatus, newState: NotificationStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitNotificationEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitNotificationSent(tenantId: string, notificationId: string, channel: string, recipientId: string, triggeredBy: string): void {
  emitNotificationEvent({ tenantId, entityType: 'notification', entityId: notificationId, action: 'sent', triggeredBy, data: { channel, recipientId } });
}

export function emitNotificationFailed(tenantId: string, notificationId: string, channel: string, errorReason: string, triggeredBy: string): void {
  emitNotificationEvent({ tenantId, entityType: 'notification', entityId: notificationId, action: 'failed', triggeredBy, data: { channel, errorReason } });
}

export function emitNotificationDelivered(tenantId: string, notificationId: string, channel: string, triggeredBy: string): void {
  emitNotificationEvent({ tenantId, entityType: 'notification', entityId: notificationId, action: 'delivered', triggeredBy, data: { channel } });
}

export function emitDigestCompiled(tenantId: string, digestId: string, recipientCount: number, notificationCount: number, triggeredBy: string): void {
  emitNotificationEvent({ tenantId, entityType: 'digest', entityId: digestId, action: 'digest_compiled', triggeredBy, data: { recipientCount, notificationCount } });
}

export function emitChannelHealthCheck(tenantId: string, channelId: string, channel: string, isHealthy: boolean, triggeredBy: string): void {
  emitNotificationEvent({ tenantId, entityType: 'channel_config', entityId: channelId, action: 'channel_health_check', triggeredBy, data: { channel, isHealthy } });
}
