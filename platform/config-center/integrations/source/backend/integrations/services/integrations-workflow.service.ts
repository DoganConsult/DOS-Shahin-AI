import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitIntegrationsEvent } from './integrations-event.service';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface IntegrationsWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = { configured: ['testing'], testing: ['active', 'configured'], active: ['degraded', 'disabled'], degraded: ['active', 'disabled'], disabled: ['configured', 'archived'], archived: [] };

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
  await safeQuery(`UPDATE "${schema}".integrations SET status = $1, updated_at = NOW() WHERE id = $2`, [toStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'integrations', 'integrations', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );

  emitIntegrationsEvent({ tenantId, entityType: 'integrations', entityId, action: 'status_changed', triggeredBy: userId, previousState: fromStatus, newState: toStatus, correlationId });
  const approvalTransitions = ['testing->active'];
  if (approvalTransitions.includes(`${fromStatus}->${toStatus}`)) {
    await safeQuery(`INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Approval Required: ${toStatus}`, `Integrations ${entityId} requires approval for ${toStatus}`, 'integrations', entityId]).catch(catchHandler(EC.EVENT_BUS));
  }
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`, [tenantId, entityId]);
  return result.rows;
}

export async function handleApprovalOutcome(tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".integrations WHERE id = $1`, [entityId]);
  if (current.rows.length === 0) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: IntegrationsWorkflowContext): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
export async function onTaskCreated(ctx: IntegrationsWorkflowContext, taskId: string): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
export async function onApprovalRequired(ctx: IntegrationsWorkflowContext, approverRole: string): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
export async function onEscalation(ctx: IntegrationsWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
export async function onClosure(ctx: IntegrationsWorkflowContext, closureReason: string): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'closed', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
export async function onFailure(ctx: IntegrationsWorkflowContext, error: string): Promise<void> {

  emitIntegrationsEvent({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
