import { eventBus } from '../ports/events.port';
import type { ActionStatus } from '../types/action.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ActionEntityType = 'action_item' | 'follow_up' | 'subtask';
export type ActionAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'unassigned'
  | 'started' | 'completed' | 'verified' | 'cancelled' | 'reopened'
  | 'overdue_detected' | 'due_soon_warning' | 'sla_breached'
  | 'escalated' | 'priority_changed'
  | 'subtask_added' | 'subtask_completed'
  | 'evidence_attached' | 'comment_added'
  | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface ActionEventOptions {
  tenantId: string;
  entityType: ActionEntityType;
  entityId: string;
  action: ActionAction;
  triggeredBy: string;
  previousState?: ActionStatus;
  newState?: ActionStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ActionAction): 'info' | 'warning' | 'critical' {
  if (act === 'sla_breached' || act === 'overdue_detected') return 'critical';
  if (act === 'due_soon_warning' || act === 'escalated' || act === 'reopened') return 'warning';
  return 'info';
}

export function emitActionEvent(opts: ActionEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `action.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'action',
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

export function emitActionStatusChange(
  tenantId: string, entityType: ActionEntityType, entityId: string,
  previousState: ActionStatus, newState: ActionStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitActionEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitActionAssigned(tenantId: string, actionId: string, assignedTo: string, priority: string, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'assigned', triggeredBy, data: { assignedTo, priority } });
}

export function emitActionCompleted(tenantId: string, actionId: string, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'completed', triggeredBy, newState: 'completed' });
}

export function emitActionOverdue(tenantId: string, actionId: string, daysOverdue: number, priority: string, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'overdue_detected', triggeredBy, data: { daysOverdue, priority } });
}

export function emitActionEscalated(tenantId: string, actionId: string, escalatedTo: string, reason: string, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'escalated', triggeredBy, data: { escalatedTo, reason } });
}

export function emitDueSoonWarning(tenantId: string, actionId: string, hoursRemaining: number, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'due_soon_warning', triggeredBy, data: { hoursRemaining } });
}

export function emitPriorityChanged(tenantId: string, actionId: string, oldPriority: string, newPriority: string, triggeredBy: string): void {
  emitActionEvent({ tenantId, entityType: 'action_item', entityId: actionId, action: 'priority_changed', triggeredBy, data: { oldPriority, newPriority } });
}
