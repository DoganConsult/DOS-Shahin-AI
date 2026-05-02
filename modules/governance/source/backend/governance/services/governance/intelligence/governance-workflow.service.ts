import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitGovernanceEvent } from './governance-event.service';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { logger } from '../../../ports/logger.port';

export interface GovernanceWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: GovernanceWorkflowContext): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, created_at)
     VALUES ($1, $2, 'workflow_triggered', $3, $4, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null],
  ).catch(() => {});
  emitGovernanceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'updated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { trigger: 'workflow_start' },
  });
  logger.info('[Governance] workflow triggered', { entityType: ctx.entityType, entityId: ctx.entityId });
}

export async function onTaskCreated(ctx: GovernanceWorkflowContext, taskId: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'task_created', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ taskId })],
  ).catch(() => {});
  logger.info('[Governance] task created', { entityType: ctx.entityType, entityId: ctx.entityId, taskId });
}

export async function onApprovalRequired(ctx: GovernanceWorkflowContext, approverRole: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'approval_required', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ approverRole })],
  ).catch(() => {});
  await createProcessTask(ctx.tenantId, {
    title: `Approval required: ${ctx.entityType} review`,
    description: `Governance ${ctx.entityType} ${ctx.entityId} requires approval by ${approverRole}.`,
    taskType: 'approval',
    priority: 'high',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    triggerSource: 'governance.approval_required',
  }).catch(() => {});
  emitGovernanceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'escalated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { approverRole, trigger: 'approval_hook' },
  });
  logger.info('[Governance] approval required', { entityType: ctx.entityType, entityId: ctx.entityId, approverRole });
}

export async function onEscalation(ctx: GovernanceWorkflowContext, reason: string, escalateTo: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'escalated', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ reason, escalateTo })],
  ).catch(() => {});
  await createProcessTask(ctx.tenantId, {
    title: `Escalation: ${ctx.entityType} requires attention`,
    description: `Governance ${ctx.entityType} ${ctx.entityId} escalated: ${reason}. Escalated to ${escalateTo}.`,
    taskType: 'escalation',
    priority: 'critical',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    triggerSource: 'governance.escalation',
  }).catch(() => {});
  emitGovernanceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'escalated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { reason, escalateTo, trigger: 'escalation_hook' },
  });
  logger.warn('[Governance] escalation', { entityType: ctx.entityType, entityId: ctx.entityId, reason, escalateTo });
}

export async function onClosure(ctx: GovernanceWorkflowContext, closureReason: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'closed', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ closureReason })],
  ).catch(() => {});
  emitGovernanceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'updated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { closureReason, trigger: 'closure_hook' },
  });
  logger.info('[Governance] closure', { entityType: ctx.entityType, entityId: ctx.entityId, closureReason });
}

export async function onFailure(ctx: GovernanceWorkflowContext, error: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".governance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'workflow_failed', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ error })],
  ).catch(() => {});
  emitGovernanceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'updated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { error, trigger: 'failure_compensation' },
  });
  logger.error('[Governance] workflow failure', { entityType: ctx.entityType, entityId: ctx.entityId, error });
}
