/**
 * Canonical Workflow Event Service — DOS (Patch 7 §2.3)
 * @owner DOS
 * @since 2026-03-30
 */
import { eventBus } from '@dos/event-backbone';
import type { WorkflowStatus } from '../workflow.types';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core';

export type WorkflowEntityType =
  | 'workflow'
  | 'task'
  | 'approval'
  | 'escalation'
  | 'template'
  | 'step'
  | 'automation';

export type WorkflowAction =
  | 'workflow_initiated'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_cancelled'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'task_assigned'
  | 'task_completed'
  | 'task_escalated'
  | 'task_delegated'
  | 'task_overdue'
  | 'task_reopened'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'approval_escalated'
  | 'approval_withdrawn'
  | 'sla_warning'
  | 'sla_breached'
  | 'sla_reset'
  | 'step_completed'
  | 'step_failed'
  | 'step_skipped'
  | 'automation_triggered'
  | 'automation_completed'
  | 'automation_failed'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'escalated'
  | 'approved'
  | 'rejected'
  | 'exported';

type EventSeverity = 'info' | 'warning' | 'critical';

const SEVERITY_MAP: Partial<Record<WorkflowAction, EventSeverity>> = {
  workflow_failed: 'critical',
  workflow_cancelled: 'warning',
  task_overdue: 'warning',
  task_escalated: 'warning',
  approval_denied: 'warning',
  approval_escalated: 'warning',
  sla_warning: 'warning',
  sla_breached: 'critical',
  step_failed: 'critical',
  automation_failed: 'critical',
  rejected: 'warning',
};

export interface WorkflowEventOptions {
  tenantId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  action: WorkflowAction;
  triggeredBy: string;
  previousState?: WorkflowStatus;
  newState?: WorkflowStatus;
  correlationId?: string;
  workflowType?: string;
  priority?: string;
  stepCode?: string;
  assigneeId?: string;
  automationCode?: string;
  slaHoursRemaining?: number;
  slaBreachHours?: number;
  data?: Record<string, unknown>;
}

export function emitWorkflowEvent(opts: WorkflowEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `workflow.${opts.entityType}.${opts.action}` as string;
    const severity: EventSeverity = SEVERITY_MAP[opts.action] ?? 'info';
    eventBus.publish({
      eventType,
      tenantId: opts.tenantId,
      sourceService: 'workflow',
      severity,
      payload: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        triggeredBy: opts.triggeredBy,
        correlationId,
        previousState: opts.previousState,
        newState: opts.newState,
        workflowType: opts.workflowType,
        priority: opts.priority,
        stepCode: opts.stepCode,
        assigneeId: opts.assigneeId,
        automationCode: opts.automationCode,
        slaHoursRemaining: opts.slaHoursRemaining,
        slaBreachHours: opts.slaBreachHours,
        timestamp: new Date().toISOString(),
        eventVersion: 1,
        ...(opts.data || {}),
      },
    });
  } catch {
    // Non-critical: events are best-effort
  }
}

export function emitWorkflowStatusChange(
  tenantId: string,
  entityType: WorkflowEntityType,
  entityId: string,
  previousState: WorkflowStatus,
  newState: WorkflowStatus,
  triggeredBy: string,
  correlationId?: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType, entityId,
    action: 'status_changed',
    triggeredBy, previousState, newState,
    correlationId, workflowType,
  });
}

export function emitWorkflowInitiated(
  tenantId: string,
  workflowId: string,
  triggeredBy: string,
  workflowType?: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'workflow_initiated', triggeredBy,
    newState: 'active', workflowType, correlationId,
  });
}

export function emitWorkflowCompleted(
  tenantId: string,
  workflowId: string,
  triggeredBy: string,
  workflowType?: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'workflow_completed', triggeredBy,
    previousState: 'active', newState: 'completed',
    workflowType, correlationId,
  });
}

export function emitWorkflowFailed(
  tenantId: string,
  workflowId: string,
  triggeredBy: string,
  reason: string,
  workflowType?: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'workflow_failed', triggeredBy,
    newState: 'failed', workflowType, correlationId,
    data: { reason },
  });
}

export function emitWorkflowCancelled(
  tenantId: string,
  workflowId: string,
  triggeredBy: string,
  reason?: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'workflow_cancelled', triggeredBy,
    newState: 'cancelled', correlationId,
    data: { reason },
  });
}

export function emitTaskAssigned(
  tenantId: string,
  taskId: string,
  assigneeId: string,
  triggeredBy: string,
  priority?: string,
  workflowId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'task', entityId: taskId,
    action: 'task_assigned', triggeredBy,
    assigneeId, priority,
    data: { workflowId },
  });
}

export function emitTaskCompleted(
  tenantId: string,
  taskId: string,
  triggeredBy: string,
  workflowId?: string,
  stepCode?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'task', entityId: taskId,
    action: 'task_completed', triggeredBy,
    stepCode, data: { workflowId },
  });
}

export function emitTaskEscalated(
  tenantId: string,
  taskId: string,
  triggeredBy: string,
  escalateTo: string,
  reason: string,
  priority?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'task', entityId: taskId,
    action: 'task_escalated', triggeredBy, priority,
    data: { escalateTo, reason },
  });
}

export function emitTaskDelegated(
  tenantId: string,
  taskId: string,
  triggeredBy: string,
  fromAssignee: string,
  toAssignee: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'task', entityId: taskId,
    action: 'task_delegated', triggeredBy,
    data: { fromAssignee, toAssignee },
  });
}

export function emitTaskOverdue(
  tenantId: string,
  taskId: string,
  hoursOverdue: number,
  assigneeId?: string,
  priority?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'task', entityId: taskId,
    action: 'task_overdue', triggeredBy: SYSTEM_JOB_ACTOR,
    assigneeId, priority,
    data: { hoursOverdue },
  });
}

export function emitApprovalRequested(
  tenantId: string,
  workflowId: string,
  approverId: string,
  triggeredBy: string,
  workflowType?: string,
  priority?: string,
  slaHours?: number,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'approval', entityId: workflowId,
    action: 'approval_requested', triggeredBy,
    workflowType, priority,
    data: { approverId, slaHours },
  });
}

export function emitApprovalGranted(
  tenantId: string,
  workflowId: string,
  approverId: string,
  triggeredBy: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'approval', entityId: workflowId,
    action: 'approval_granted', triggeredBy,
    workflowType, data: { approverId },
  });
}

export function emitApprovalDenied(
  tenantId: string,
  workflowId: string,
  approverId: string,
  triggeredBy: string,
  reason: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'approval', entityId: workflowId,
    action: 'approval_denied', triggeredBy,
    workflowType, data: { approverId, reason },
  });
}

export function emitApprovalEscalated(
  tenantId: string,
  workflowId: string,
  escalateTo: string,
  triggeredBy: string,
  hoursWaiting: number,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'approval', entityId: workflowId,
    action: 'approval_escalated', triggeredBy,
    workflowType, data: { escalateTo, hoursWaiting },
  });
}

export function emitSlaWarning(
  tenantId: string,
  workflowId: string,
  hoursRemaining: number,
  priority?: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'sla_warning', triggeredBy: SYSTEM_JOB_ACTOR,
    priority, workflowType, slaHoursRemaining: hoursRemaining,
    data: { hoursRemaining },
  });
}

export function emitSlaBreached(
  tenantId: string,
  workflowId: string,
  hoursBreached: number,
  priority?: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'sla_breached', triggeredBy: SYSTEM_JOB_ACTOR,
    priority, workflowType, slaBreachHours: hoursBreached,
    data: { hoursBreached },
  });
}

export function emitStepCompleted(
  tenantId: string,
  workflowId: string,
  stepCode: string,
  triggeredBy: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'step', entityId: workflowId,
    action: 'step_completed', triggeredBy,
    stepCode, workflowType,
  });
}

export function emitStepFailed(
  tenantId: string,
  workflowId: string,
  stepCode: string,
  triggeredBy: string,
  reason: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'step', entityId: workflowId,
    action: 'step_failed', triggeredBy,
    stepCode, workflowType,
    data: { reason },
  });
}

export function emitAutomationTriggered(
  tenantId: string,
  workflowId: string,
  automationCode: string,
  triggeredBy: string,
  workflowType?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'automation', entityId: workflowId,
    action: 'automation_triggered', triggeredBy,
    automationCode, workflowType,
  });
}

export function emitAutomationCompleted(
  tenantId: string,
  workflowId: string,
  automationCode: string,
  triggeredBy: string,
  resultSummary?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'automation', entityId: workflowId,
    action: 'automation_completed', triggeredBy,
    automationCode, data: { resultSummary },
  });
}

export function emitAutomationFailed(
  tenantId: string,
  workflowId: string,
  automationCode: string,
  triggeredBy: string,
  error: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'automation', entityId: workflowId,
    action: 'automation_failed', triggeredBy,
    automationCode, data: { error },
  });
}
