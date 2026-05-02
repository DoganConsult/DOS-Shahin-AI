import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import { randomUUID as _randomUUID } from 'crypto';

export interface WorkflowWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'failed'],
  active: ['paused', 'completed', 'failed'],
  paused: ['active', 'failed'],
  completed: ['archived'],
  failed: ['archived'],
  archived: [],
};

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
    return { success: false, error: `Transition ${fromStatus} -> ${toStatus} is not allowed` };
  }
  const schema = tenantSchema(tenantId);
  const updated = await safeQuery(
    `UPDATE "${schema}".workflow_instances SET status = $1, updated_at = NOW() WHERE instance_id = $2 AND tenant_id = $3 RETURNING instance_id`,
    [toStatus, entityId, tenantId],
  );
  if (!updated?.rows?.length) {
    return { success: false, error: 'Entity not found or update failed' };
  }
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'workflow', 'instance', entityId, fromStatus, toStatus],
  );
  (emitWorkflowEvent as any)({
    tenantId,
    instanceId: entityId,
    eventType: 'step_entered',
    triggeredBy: userId,
    previousState: fromStatus,
    newState: toStatus,
    payload: { fromStatus, toStatus },
  });
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT action, before_state, after_state, user_id, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND entity_type = 'instance' ORDER BY created_at ASC`,
    [tenantId, entityId],
  );
  return result?.rows ?? [];
}

export async function handleApprovalOutcome(
  tenantId: string,
  entityId: string,
  approved: boolean,
  approverId: string,
  comments: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT status FROM "${schema}".workflow_instances WHERE instance_id = $1 AND tenant_id = $2`,
    [entityId, tenantId],
  );
  const fromStatus = current?.rows?.[0]?.status;
  if (!fromStatus) return;
  const toStatus = approved ? 'completed' : 'failed';
  if (!validateTransition(fromStatus, toStatus)) return;
  await safeQuery(
    `UPDATE "${schema}".workflow_instances SET status = $1, updated_at = NOW() WHERE instance_id = $2 AND tenant_id = $3`,
    [toStatus, entityId, tenantId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, approverId, 'workflow', 'instance', entityId, fromStatus, toStatus],
  );
  (emitWorkflowEvent as any)({
    tenantId,
    instanceId: entityId,
    eventType: approved ? 'approved' : 'rejected',
    triggeredBy: approverId,
    previousState: fromStatus,
    newState: toStatus,
    payload: { approved, comments, fromStatus, toStatus },
  });
}

export async function autoTransitionOnCondition(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const candidates = await safeQuery(
    `SELECT instance_id FROM "${schema}".workflow_instances WHERE tenant_id = $1 AND status IN ('completed', 'failed') AND updated_at < NOW() - INTERVAL '30 days'`,
    [tenantId],
  );
  for (const row of candidates?.rows ?? []) {
    await safeQuery(
      `UPDATE "${schema}".workflow_instances SET status = 'archived', updated_at = NOW() WHERE instance_id = $1 AND tenant_id = $2`,
      [row.instance_id, tenantId],
    );
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
      [tenantId, 'system', 'workflow', 'instance', row.instance_id, 'terminal', 'archived'],
    );
  }
}

export async function onWorkflowTriggered(ctx: WorkflowWorkflowContext): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'started',
    triggeredBy: ctx.triggeredBy,
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, trigger: 'workflow_start' },
  });
}

export async function onTaskCreated(ctx: WorkflowWorkflowContext, taskId: string): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'task_created',
    triggeredBy: 'workflow',
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, taskId, trigger: 'task_creation' },
  });
}

export async function onApprovalRequired(ctx: WorkflowWorkflowContext, approverRole: string): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'escalated',
    triggeredBy: 'workflow',
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, approverRole, trigger: 'approval_hook' },
  });
}

export async function onEscalation(ctx: WorkflowWorkflowContext, reason: string, escalateTo: string): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'escalated',
    triggeredBy: 'workflow',
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, reason, escalateTo, trigger: 'escalation_hook' },
  });
}

export async function onClosure(ctx: WorkflowWorkflowContext, closureReason: string): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'completed',
    triggeredBy: ctx.triggeredBy,
    newState: 'closed',
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, closureReason, trigger: 'closure_hook' },
  });
}

export async function onFailure(ctx: WorkflowWorkflowContext, error: string): Promise<void> {
  (emitWorkflowEvent as any)({
    tenantId: ctx.tenantId,
    instanceId: ctx.entityId,
    eventType: 'cancelled',
    triggeredBy: 'workflow',
    payload: { entityType: ctx.entityType, correlationId: ctx.correlationId, error, trigger: 'failure_compensation' },
  });
}
