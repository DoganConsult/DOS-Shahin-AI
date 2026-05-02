import type { ActionStatus } from '../types/action.types';
export type ActionEntityType = 'action_item' | 'follow_up' | 'subtask';
export type ActionAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'reassigned' | 'unassigned' | 'started' | 'completed' | 'verified' | 'cancelled' | 'reopened' | 'overdue_detected' | 'due_soon_warning' | 'sla_breached' | 'escalated' | 'priority_changed' | 'subtask_added' | 'subtask_completed' | 'evidence_attached' | 'comment_added' | 'approved' | 'rejected' | 'bulk_updated' | 'exported';
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
export declare function emitActionEvent(opts: ActionEventOptions): void;
export declare function emitActionStatusChange(tenantId: string, entityType: ActionEntityType, entityId: string, previousState: ActionStatus, newState: ActionStatus, triggeredBy: string, correlationId?: string): void;
export declare function emitActionAssigned(tenantId: string, actionId: string, assignedTo: string, priority: string, triggeredBy: string): void;
export declare function emitActionCompleted(tenantId: string, actionId: string, triggeredBy: string): void;
export declare function emitActionOverdue(tenantId: string, actionId: string, daysOverdue: number, priority: string, triggeredBy: string): void;
export declare function emitActionEscalated(tenantId: string, actionId: string, escalatedTo: string, reason: string, triggeredBy: string): void;
export declare function emitDueSoonWarning(tenantId: string, actionId: string, hoursRemaining: number, triggeredBy: string): void;
export declare function emitPriorityChanged(tenantId: string, actionId: string, oldPriority: string, newPriority: string, triggeredBy: string): void;
