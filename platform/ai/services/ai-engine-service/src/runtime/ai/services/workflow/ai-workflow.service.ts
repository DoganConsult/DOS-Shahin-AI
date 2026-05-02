import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitAiEvent } from './ai-event.service';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface AiWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = { draft: ['in_review'], in_review: ['approved', 'draft'], approved: ['active'], active: ['suspended', 'decommissioned'], suspended: ['active', 'decommissioned', 'archived'], decommissioned: ['archived'], archived: [], configured: ['testing'] };

export function validateTransition(fromStatus: string, toStatus: string): boolean {
  return (ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(toStatus);
}

export function getAvailableTransitions(status: string): string[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export async function executeTransition(
  tenantId: string, entityId: string, fromStatus: string, toStatus: string, userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!validateTransition(fromStatus, toStatus)) return { success: false, error: `Invalid transition: ${fromStatus} -> ${toStatus}` };
  const schema = tenantSchema(tenantId);
  const correlationId = randomUUID();
  await safeQuery(`UPDATE "${schema}".ai_invocations SET status = $1, updated_at = NOW() WHERE id = $2`, [toStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'ai', 'ai', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );

  emitAiEvent({ tenantId, entityType: 'ai' as string, entityId, action: 'status_changed', triggeredBy: userId, previousState: fromStatus as string, newState: toStatus as string, correlationId });
  const approvalTransitions = ['in_review->approved'];
  if (approvalTransitions.includes(`${fromStatus}->${toStatus}`)) {
    await safeQuery(`INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Approval Required: ${toStatus}`, `Ai ${entityId} requires approval for ${toStatus}`, 'ai', entityId]).catch(catchHandler(EC.EVENT_BUS));
  }
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT actor_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`, [tenantId, entityId]);
  return result.rows;
}

export async function handleApprovalOutcome(tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".ai_invocations WHERE id = $1`, [entityId]);
  if (current.rows.length === 0) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: AiWorkflowContext): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
export async function onTaskCreated(ctx: AiWorkflowContext, taskId: string): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
export async function onApprovalRequired(ctx: AiWorkflowContext, approverRole: string): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
export async function onEscalation(ctx: AiWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
export async function onClosure(ctx: AiWorkflowContext, closureReason: string): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'closed' as string, correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
export async function onFailure(ctx: AiWorkflowContext, error: string): Promise<void> {

  emitAiEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType as string, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
