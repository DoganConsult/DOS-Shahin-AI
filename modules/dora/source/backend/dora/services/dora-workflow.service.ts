import { safeQuery, tenantSchema } from '../ports/database.port';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface DoraWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'draft': ['in_review'],
  'in_review': ['approved', 'draft'],
  'approved': ['active'],
  'active': ['suspended', 'archived'],
  'suspended': ['active', 'archived'],
  'archived': [],
};

const PROTECTED_TRANSITIONS = ['in_review->approved'];

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
  const _correlationId = randomUUID();
  await safeQuery(
    `UPDATE "${schema}".dora_resilience_tests SET status = $1, updated_at = NOW() WHERE id = $2`,
    [toStatus, entityId],
  );
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'dora', 'resilience_test', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );
  if (isProtectedTransition(fromStatus, toStatus)) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Dora Approval Required: ${toStatus}`, `Dora ${entityId} requires approval for transition to ${toStatus}`, 'resilience_test', entityId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
  return { success: true };
}

export async function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'dora' AND action = 'transition' ORDER BY created_at ASC`,
    [tenantId, entityId],
  );
  return result?.rows ?? [];
}

export async function handleApprovalOutcome(
  tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT status FROM "${schema}".dora_resilience_tests WHERE id = $1`, [entityId]);
  if (!current?.rows?.length) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: DoraWorkflowContext): Promise<void> { void ctx; }
export async function onTaskCreated(ctx: DoraWorkflowContext, _taskId: string): Promise<void> { void ctx; }
export async function onApprovalRequired(ctx: DoraWorkflowContext, _approverRole: string): Promise<void> { void ctx; }
export async function onEscalation(ctx: DoraWorkflowContext, _reason: string, _escalateTo: string): Promise<void> { void ctx; }
export async function onClosure(ctx: DoraWorkflowContext, _closureReason: string): Promise<void> { void ctx; }
export async function onFailure(ctx: DoraWorkflowContext, _error: string): Promise<void> { void ctx; }
