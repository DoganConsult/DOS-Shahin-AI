import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitAnalyticsEvent, type AnalyticsEntityType } from './analytics-event.service';
import type { AnalyticsStatus } from '@dos/types/analytics';
import { randomUUID } from 'crypto';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface AnalyticsWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export const ALLOWED_TRANSITIONS: Record<string, string[]> = { draft: ['scheduled'], scheduled: ['generating'], generating: ['published', 'draft'], published: ['stale', 'archived'], stale: ['generating', 'archived'], archived: [] };

const ANALYTICS_ENTITY_TYPES = new Set<AnalyticsEntityType>([
  'dashboard',
  'widget',
  'kpi',
  'report_snapshot',
  'data_source',
  'kpi_threshold',
]);

function toAnalyticsEntityType(entityType: string): AnalyticsEntityType {
  return ANALYTICS_ENTITY_TYPES.has(entityType as AnalyticsEntityType)
    ? (entityType as AnalyticsEntityType)
    : 'report_snapshot';
}

function toAnalyticsStatus(status: string): AnalyticsStatus {
  return status as AnalyticsStatus;
}

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
  await safeQuery(`UPDATE "${schema}".analytics_reports SET status = $1, updated_at = NOW() WHERE id = $2`, [toStatus, entityId]);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`,
    [tenantId, userId, 'analytics', 'analytics', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })],
  );

  emitAnalyticsEvent({
    tenantId,
    entityType: 'report_snapshot',
    entityId,
    action: 'status_changed',
    triggeredBy: userId,
    previousState: toAnalyticsStatus(fromStatus),
    newState: toAnalyticsStatus(toStatus),
    correlationId,
  });
  const approvalTransitions = ['generating->published'];
  if (approvalTransitions.includes(`${fromStatus}->${toStatus}`)) {
    await safeQuery(`INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`,
      [tenantId, `Approval Required: ${toStatus}`, `Analytics ${entityId} requires approval for ${toStatus}`, 'analytics', entityId]).catch(catchHandler(EC.EVENT_BUS));
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
  const current = await safeQuery(`SELECT status FROM "${schema}".analytics_reports WHERE id = $1`, [entityId]);
  if (current.rows.length === 0) return { success: false, error: 'Entity not found' };
  const currentStatus = current.rows[0].status;
  if (outcome === 'rejected') {
    const prev = Object.entries(ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
    return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
  }
  const next = getAvailableTransitions(currentStatus);
  return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}

export async function onWorkflowTriggered(ctx: AnalyticsWorkflowContext): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
export async function onTaskCreated(ctx: AnalyticsWorkflowContext, taskId: string): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
export async function onApprovalRequired(ctx: AnalyticsWorkflowContext, approverRole: string): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
export async function onEscalation(ctx: AnalyticsWorkflowContext, reason: string, escalateTo: string): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
export async function onClosure(ctx: AnalyticsWorkflowContext, closureReason: string): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: toAnalyticsStatus('closed'), correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
export async function onFailure(ctx: AnalyticsWorkflowContext, error: string): Promise<void> {

  emitAnalyticsEvent({ tenantId: ctx.tenantId, entityType: toAnalyticsEntityType(ctx.entityType), entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
