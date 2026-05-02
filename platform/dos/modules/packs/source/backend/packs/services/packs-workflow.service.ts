import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitPacksEvent } from './packs-event.service';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface PacksWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['assembling'],
  assembling: ['in_review'],
  in_review: ['approved', 'assembling'],
  approved: ['published'],
  published: ['distributed', 'expired'],
  distributed: ['expired', 'archived'],
  expired: ['archived'],
  archived: [],
};

const PROTECTED_TRANSITIONS = ['in_review->approved', 'approved->published'];

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
    `UPDATE "${schema}".pack_installations SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
    [toStatus, entityId, tenantId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'packs', 'pack', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );
  if (isProtectedTransition(fromStatus, toStatus)) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Pack Approval Required: ${toStatus}`, `Pack ${entityId} requires approval for transition to ${toStatus}`, 'pack', entityId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
  emitPacksEvent({
    tenantId,
    entityType: 'pack',
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
    `SELECT actor_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'packs' AND action = 'transition' ORDER BY created_at ASC`,
    [tenantId, entityId],
  );
  return result?.rows ?? [];
}

export async function handleApprovalOutcome(
  tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".pack_installations WHERE id = $1 AND tenant_id = $2`, [entityId, tenantId]);
  if (!current?.rows?.length) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: PacksWorkflowContext): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
export async function onTaskCreated(ctx: PacksWorkflowContext, taskId: string): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
export async function onApprovalRequired(ctx: PacksWorkflowContext, approverRole: string): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
export async function onEscalation(ctx: PacksWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
export async function onClosure(ctx: PacksWorkflowContext, closureReason: string): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'archived', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
export async function onFailure(ctx: PacksWorkflowContext, error: string): Promise<void> {

  emitPacksEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
