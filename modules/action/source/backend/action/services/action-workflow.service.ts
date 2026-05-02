/**
 * Action Workflow Service
 * Handles workflow lifecycle events: trigger, approval, escalation, closure, failure.
 * @owner Module:action
 */
import { logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { recordAudit } from '../ports/audit.port';
import { evaluateLifecycleTransition } from '../ports/auth.port';
import { initiateApproval } from '../../workflow/services/approvals/approval-routing.service';
import { emitEvent } from '../ports/events.port';
import { safeQuery } from "@dos/db";

// ---------------------------------------------------------------------------
// Context interface
// ---------------------------------------------------------------------------

export interface ActionWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

// ---------------------------------------------------------------------------
// Workflow triggered
// ---------------------------------------------------------------------------

/** Record that a task was created inside the action workflow. */
export async function onTaskCreated(ctx: ActionWorkflowContext, taskId: string): Promise<void> {
  logger.info(
    'Action task created',
    { entityId: ctx.entityId, taskId, triggeredBy: ctx.triggeredBy },
  );

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'create',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'task_created', taskId, correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));

  await emitEvent({
    eventType: 'action.workflow.task_created',
    tenantId: ctx.tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: {
      entityId: ctx.entityId,
      entityType: ctx.entityType,
      taskId,
      triggeredBy: ctx.triggeredBy,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
    },
  } as never).catch(catchHandler(EC.EVENT_BUS));
}

/** Record that a workflow has been triggered for an action entity. */
export async function onWorkflowTriggered(ctx: ActionWorkflowContext): Promise<void> {
  logger.info(
    'Action workflow triggered',
    { entityId: ctx.entityId, entityType: ctx.entityType, triggeredBy: ctx.triggeredBy },
  );

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'create',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'workflow_triggered', correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));

  await emitEvent({
    eventType: 'action.workflow.triggered',
    tenantId: ctx.tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: {
      entityId: ctx.entityId,
      entityType: ctx.entityType,
      triggeredBy: ctx.triggeredBy,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
    },
  } as never).catch(catchHandler(EC.EVENT_BUS));
}

// ---------------------------------------------------------------------------
// Approval required
// ---------------------------------------------------------------------------

/** Route an action entity through the approval workflow. */
export async function onApprovalRequired(
  ctx: ActionWorkflowContext,
  approverRole: string,
): Promise<void> {
  logger.info(
    'Action approval required',
    { entityId: ctx.entityId, approverRole, triggeredBy: ctx.triggeredBy },
  );

  await initiateApproval(ctx.tenantId, {
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    action: 'approve',
    requestedBy: ctx.triggeredBy,
    routeId: `action.${ctx.entityType}.approval`,
    context: {
      approverRole,
      correlationId: ctx.correlationId,
    },
  });

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'create',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'approval_required', approverRole, correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

/** Record and emit an escalation event for an action entity. */
export async function onEscalation(
  ctx: ActionWorkflowContext,
  reason: string,
  escalateTo: string,
): Promise<void> {
  logger.warn(
    'Action escalation triggered',
    { entityId: ctx.entityId, reason, escalateTo, triggeredBy: ctx.triggeredBy },
  );

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'update',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'escalated', reason, escalateTo, correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));

  await emitEvent({
    eventType: 'action.workflow.escalated',
    tenantId: ctx.tenantId,
    sourceService: 'action',
    severity: 'warning',
    payload: {
      entityId: ctx.entityId,
      entityType: ctx.entityType,
      reason,
      escalateTo,
      triggeredBy: ctx.triggeredBy,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
    },
  } as never).catch(catchHandler(EC.EVENT_BUS));
}

// ---------------------------------------------------------------------------
// Closure
// ---------------------------------------------------------------------------

/** Validate lifecycle transition via DAuth, then record closure. */
export async function onClosure(
  ctx: ActionWorkflowContext,
  closureReason: string,
): Promise<void> {
  logger.info(
    'Action closure requested',
    { entityId: ctx.entityId, closureReason, triggeredBy: ctx.triggeredBy },
  );

  await evaluateLifecycleTransition(ctx.tenantId, ctx.triggeredBy, {
    moduleCode: 'action',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    fromState: 'verified',
    toState: 'closed',
    permissionCode: 'action.item.close',
    userRoles: [],
  });

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'update',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'closed', closureReason, correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));

  await emitEvent({
    eventType: 'action.workflow.closed',
    tenantId: ctx.tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: {
      entityId: ctx.entityId,
      entityType: ctx.entityType,
      closureReason,
      triggeredBy: ctx.triggeredBy,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
    },
  } as never).catch(catchHandler(EC.EVENT_BUS));
}

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

/** Record and emit a workflow failure event. */
export async function onFailure(
  ctx: ActionWorkflowContext,
  error: string,
): Promise<void> {
  logger.error(
    'Action workflow failure',
    { entityId: ctx.entityId, error, triggeredBy: ctx.triggeredBy },
  );

  await recordAudit({
    tenantId: ctx.tenantId,
    userId: ctx.triggeredBy,
    module: 'action',
    action: 'update',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    afterState: { event: 'workflow_failed', error, correlationId: ctx.correlationId },
  }).catch(catchHandler(EC.EVENT_BUS));

  await emitEvent({
    eventType: 'action.workflow.failed',
    tenantId: ctx.tenantId,
    sourceService: 'action',
    severity: 'critical',
    payload: {
      entityId: ctx.entityId,
      entityType: ctx.entityType,
      error,
      triggeredBy: ctx.triggeredBy,
      correlationId: ctx.correlationId,
      timestamp: new Date().toISOString(),
    },
  } as never).catch(catchHandler(EC.EVENT_BUS));
}
