import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitIssuesEvent } from './issues-event.service';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface IssuesWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = { open: ['triaged'], triaged: ['investigating'], investigating: ['in_progress'], in_progress: ['pending_verification'], pending_verification: ['resolved', 'in_progress'], resolved: ['closed'], closed: ['archived'], archived: [] };

export function validateTransition(fromStatus: string, toStatus: string): boolean {
  return (ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(toStatus);
}

export function getAvailableTransitions(status: string): string[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
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
    `UPDATE "${schema}".issues SET status = $1, updated_at = NOW() WHERE id = $2`,
    [toStatus, entityId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'issues', 'issues', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );
  emitIssuesEvent({
    tenantId,

    entityType: 'issues',
    entityId,
    action: 'status_changed',
    triggeredBy: userId,

    previousState: fromStatus,

    newState: toStatus,
    correlationId,
  });
  const approvalTransitions = ['pending_verification->resolved'];
  if (approvalTransitions.includes(`${fromStatus}->${toStatus}`)) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority)
       VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Approval Required: ${toStatus}`, `Issues ${entityId} requires approval for ${toStatus}`, 'issues', entityId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail
     WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`,
    [tenantId, entityId],
  );
  return result.rows;
}

export async function handleApprovalOutcome(
  tenantId: string,
  entityId: string,
  outcome: 'approved' | 'rejected',
  userId: string,
  _comments?: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT status FROM "${schema}".issues WHERE id = $1`,
    [entityId],
  );
  if (current.rows.length === 0) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    const revertTo = prev ? prev[0] : currentStatus;
    return executeTransition(tenantId, entityId, currentStatus, revertTo, userId);
  }
  const nextStatuses = getAvailableTransitions(currentStatus);
  if (nextStatuses.length > 0) {
    return executeTransition(tenantId, entityId, currentStatus, nextStatuses[0], userId);
  }
  return { success: false, error: `No available transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: IssuesWorkflowContext): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}

export async function onTaskCreated(ctx: IssuesWorkflowContext, taskId: string): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}

export async function onApprovalRequired(ctx: IssuesWorkflowContext, approverRole: string): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}

export async function onEscalation(ctx: IssuesWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}

export async function onClosure(ctx: IssuesWorkflowContext, closureReason: string): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'closed', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}

export async function onFailure(ctx: IssuesWorkflowContext, error: string): Promise<void> {

  emitIssuesEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
