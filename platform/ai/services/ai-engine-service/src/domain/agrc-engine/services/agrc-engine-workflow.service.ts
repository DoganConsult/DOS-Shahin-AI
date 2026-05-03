import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitAgrcEngineEvent } from './agrc-engine-event.service';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

export interface AgrcEngineWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'pending': ['running'],
  'running': ['completed', 'failed'],
  'completed': ['archived'],
  'failed': ['pending', 'archived'],
  'archived': [],
};

const PROTECTED_TRANSITIONS = ['running->completed'];

export function validateTransition(fromStatus: string, toStatus: string): boolean {
  return (ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(toStatus);
}

export function getAvailableTransitions(status: string): string[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export function isProtectedTransition(fromStatus: string, toStatus: string): boolean {
  return PROTECTED_TRANSITIONS.includes(`${fromStatus}->${toStatus}`);
}

export async function executeTransition(
  tenantId: string, entityId: string, fromStatus: string, toStatus: string, userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!validateTransition(fromStatus, toStatus)) {
    return { success: false, error: `Transition ${fromStatus} -> ${toStatus} is not allowed` };
  }
  const schema = tenantSchema(tenantId);
  const correlationId = randomUUID();
  await safeQuery(
    `UPDATE "${schema}".agrc_engine_runs SET status = $1, updated_at = NOW() WHERE id = $2`,
    [toStatus, entityId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'agrc-engine', 'run', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );
  if (isProtectedTransition(fromStatus, toStatus)) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `AgrcEngine Approval Required: ${toStatus}`, `AgrcEngine ${entityId} requires approval for transition to ${toStatus}`, 'run', entityId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
  emitAgrcEngineEvent({
    tenantId,

    entityType: "run",
    entityId,
    action: 'status_changed',
    triggeredBy: userId,
    previousState: fromStatus,
    newState: toStatus,
    correlationId,
  });
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT actor_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'agrc-engine' AND action = 'transition' ORDER BY created_at ASC`,
    [tenantId, entityId],
  );
  return result?.rows ?? [];
}

export async function handleApprovalOutcome(
  tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".agrc_engine_runs WHERE id = $1`, [entityId]);
  if (!current?.rows?.length) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: AgrcEngineWorkflowContext): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
export async function onTaskCreated(ctx: AgrcEngineWorkflowContext, taskId: string): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
export async function onApprovalRequired(ctx: AgrcEngineWorkflowContext, approverRole: string): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
export async function onEscalation(ctx: AgrcEngineWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
export async function onClosure(ctx: AgrcEngineWorkflowContext, closureReason: string): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'archived', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
export async function onFailure(ctx: AgrcEngineWorkflowContext, error: string): Promise<void> {

  emitAgrcEngineEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as import("./agrc-engine-event.service").AgrcEngineEntityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
