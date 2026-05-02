import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitExceptionEvent } from './exception-event.service';
import { EXCEPTION_TRANSITIONS, type ExceptionState } from '../workflows/exception-lifecycle';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface ExceptionWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export function validateTransition(fromStatus: string, toStatus: string): boolean {
  return (EXCEPTION_TRANSITIONS[fromStatus as ExceptionState] ?? []).includes(toStatus as ExceptionState);
}

export function getAvailableTransitions(status: string): string[] {
  return EXCEPTION_TRANSITIONS[status as ExceptionState] ?? [];
}

export async function executeTransition(
  tenantId: string,
  entityId: string,
  fromStatus: string,
  toStatus: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!validateTransition(fromStatus, toStatus)) {
    return { success: false, error: `Invalid transition: ${fromStatus} -> ${toStatus}` };
  }
  const schema = tenantSchema(tenantId);
  const correlationId = randomUUID();
  await safeQuery(
    `UPDATE "${schema}".exceptions SET status = $1, updated_at = NOW() WHERE exception_id = $2`,
    [toStatus, entityId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
    [entityId, fromStatus, toStatus, userId, `Transition via workflow`],
  ).catch(catchHandler(EC.EVENT_BUS));
  emitExceptionEvent({
    tenantId,
    entityType: 'exception_request',
    entityId,
    action: 'status_changed',
    triggeredBy: userId,

    previousState: fromStatus,

    newState: toStatus,
    correlationId,
  });
  const approvalTransitions = ['submitted->under_review', 'under_review->approved'];
  if (approvalTransitions.includes(`${fromStatus}->${toStatus}`)) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority)
       VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Exception Approval Required: ${toStatus}`, `Exception ${entityId} requires approval for ${toStatus}`, 'exception', entityId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT from_status, to_status, changed_by, reason, changed_at FROM "${schema}".exception_status_history
     WHERE exception_id = $1 ORDER BY changed_at ASC`,
    [entityId],
  );
  return result.rows;
}

export async function handleApprovalOutcome(
  tenantId: string,
  entityId: string,
  outcome: 'approved' | 'rejected',
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT status FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`,
    [entityId],
  );
  if (current.rows.length === 0) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(EXCEPTION_TRANSITIONS).find(([, targets]) => targets.includes(currentStatus as ExceptionState));
    const revertTo = prev ? prev[0] : currentStatus;
    return executeTransition(tenantId, entityId, currentStatus, revertTo, userId);
  }
  const nextStatuses = getAvailableTransitions(currentStatus);
  if (nextStatuses.length > 0) {
    return executeTransition(tenantId, entityId, currentStatus, nextStatuses[0], userId);
  }
  return { success: false, error: `No available transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: ExceptionWorkflowContext): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}

export async function onTaskCreated(ctx: ExceptionWorkflowContext, taskId: string): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}

export async function onApprovalRequired(ctx: ExceptionWorkflowContext, approverRole: string): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}

export async function onEscalation(ctx: ExceptionWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}

export async function onClosure(ctx: ExceptionWorkflowContext, closureReason: string): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'closed', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}

export async function onFailure(ctx: ExceptionWorkflowContext, error: string): Promise<void> {

  emitExceptionEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
