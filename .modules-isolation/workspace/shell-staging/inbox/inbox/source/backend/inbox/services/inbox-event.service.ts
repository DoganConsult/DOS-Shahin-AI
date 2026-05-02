import { eventBus } from '../ports/events.port';
import type { InboxStatus } from '../types/inbox.types';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { safeQuery } from "@dos/db";

export type InboxEntityType = 'message' | 'thread' | 'broadcast' | 'template' | 'routing_rule' | 'digest';
export type InboxAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'read' | 'unread' | 'actioned' | 'archived'
  | 'starred' | 'unstarred'
  | 'assigned' | 'escalated' | 'expired'
  | 'broadcast_sent' | 'broadcast_scheduled'
  | 'digest_generated' | 'digest_sent'
  | 'routing_rule_applied' | 'routing_rule_created' | 'routing_rule_deactivated'
  | 'priority_escalated' | 'priority_recalculated'
  | 'thread_replied' | 'thread_closed'
  | 'bulk_read' | 'bulk_archived' | 'bulk_deleted'
  | 'exported';

export interface InboxEventOptions {
  tenantId: string;
  entityType: InboxEntityType;
  entityId: string;
  action: InboxAction;
  triggeredBy: string;
  previousState?: InboxStatus;
  newState?: InboxStatus;
  correlationId?: string;
  recipientId?: string;
  channel?: string;
  sourceModule?: string;
  data?: Record<string, unknown>;
}

function severityForAction(action: InboxAction): 'info' | 'warning' | 'critical' {
  if (action === 'priority_escalated' || action === 'escalated') return 'warning';
  if (action === 'expired') return 'warning';
  return 'info';
}

export function emitInboxEvent(opts: InboxEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `inbox.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'inbox',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            recipientId: opts.recipientId,
            channel: opts.channel,
            sourceModule: opts.sourceModule,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitInboxStatusChange(
  tenantId: string, entityType: InboxEntityType, entityId: string,
  previousState: InboxStatus, newState: InboxStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitInboxEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitMessageRead(tenantId: string, messageId: string, recipientId: string, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: messageId, action: 'read', triggeredBy, recipientId, newState: 'read' });
}

export function emitMessageActioned(tenantId: string, messageId: string, recipientId: string, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: messageId, action: 'actioned', triggeredBy, recipientId, newState: 'actioned' });
}

export function emitBroadcastSent(tenantId: string, broadcastId: string, recipientCount: number, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'broadcast', entityId: broadcastId, action: 'broadcast_sent', triggeredBy, data: { recipientCount } });
}

export function emitDigestSent(tenantId: string, userId: string, period: string, messageCount: number): void {
  emitInboxEvent({ tenantId, entityType: 'digest', entityId: userId, action: 'digest_sent', triggeredBy: SYSTEM_JOB_ACTOR, data: { period, messageCount } });
}

export function emitPriorityEscalated(tenantId: string, messageId: string, previousPriority: string, newPriority: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: messageId, action: 'priority_escalated', triggeredBy: SYSTEM_JOB_ACTOR, data: { previousPriority, newPriority } });
}

export function emitMessageExpired(tenantId: string, messageId: string, recipientId: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: messageId, action: 'expired', triggeredBy: SYSTEM_JOB_ACTOR, recipientId });
}

export function emitBulkRead(tenantId: string, count: number, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: 'bulk', action: 'bulk_read', triggeredBy, data: { count } });
}

export function emitBulkArchived(tenantId: string, count: number, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'message', entityId: 'bulk', action: 'bulk_archived', triggeredBy, data: { count } });
}

export function emitThreadReplied(tenantId: string, threadId: string, messageId: string, triggeredBy: string): void {
  emitInboxEvent({ tenantId, entityType: 'thread', entityId: threadId, action: 'thread_replied', triggeredBy, data: { messageId } });
}
