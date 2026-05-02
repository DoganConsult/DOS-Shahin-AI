/**
 * Workflow module — event emission helpers.
 *
 * Backend-layer implementation that routes publication through the module's
 * events port (ports/events.port). The port wraps @dos/module-sdk's event bus,
 * giving tests a single seam to mock (vi.mock('../ports/events.port', ...)).
 *
 * Events are best-effort: publication errors must not break business flows.
 */
import { randomUUID } from 'node:crypto';
import { eventBus } from '../ports/events.port';

export type WorkflowEntityType =
  | 'workflow'
  | 'definition'
  | 'instance'
  | 'task'
  | 'approval'
  | 'escalation'
  | 'template'
  | 'step'
  | 'automation';

export type WorkflowAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'instance_started'
  | 'instance_failed'
  | 'workflow_initiated'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'sla_warning'
  | 'sla_breached'
  | 'approved'
  | 'rejected';

type EventSeverity = 'info' | 'warning' | 'critical';

const SEVERITY_MAP: Partial<Record<WorkflowAction, EventSeverity>> = {
  workflow_failed: 'critical',
  instance_failed: 'critical',
  sla_breached: 'critical',
  sla_warning: 'warning',
  rejected: 'warning',
};

export interface WorkflowEventOptions {
  tenantId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  action: WorkflowAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  workflowType?: string;
  data?: Record<string, unknown>;
}

export function emitWorkflowEvent(opts: WorkflowEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const severity: EventSeverity = SEVERITY_MAP[opts.action] ?? 'info';
    eventBus.publish({
      eventType: `workflow.${opts.entityType}.${opts.action}`,
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
        timestamp: new Date().toISOString(),
        eventVersion: 1,
        ...(opts.data || {}),
      },
    } as unknown as Parameters<typeof eventBus.publish>[0]);
  } catch {
    // best-effort
  }
}

export function emitWorkflowStatusChange(
  tenantId: string,
  entityType: WorkflowEntityType,
  entityId: string,
  previousState: string,
  newState: string,
  triggeredBy: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType, entityId,
    action: 'status_changed',
    triggeredBy, previousState, newState, correlationId,
  });
}

export function emitInstanceStarted(
  tenantId: string,
  instanceId: string,
  workflowType: string,
  triggeredBy: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'instance', entityId: instanceId,
    action: 'instance_started', triggeredBy, workflowType,
    newState: 'running', correlationId,
  });
}

export function emitInstanceFailed(
  tenantId: string,
  instanceId: string,
  workflowType: string,
  triggeredBy: string,
  reason?: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'instance', entityId: instanceId,
    action: 'instance_failed', triggeredBy, workflowType,
    newState: 'failed', correlationId,
    data: reason ? { reason } : undefined,
  });
}

export function emitSlaBreached(
  tenantId: string,
  workflowId: string,
  workflowType: string,
  triggeredBy: string,
  correlationId?: string,
): void {
  emitWorkflowEvent({
    tenantId, entityType: 'workflow', entityId: workflowId,
    action: 'sla_breached', triggeredBy, workflowType, correlationId,
  });
}
