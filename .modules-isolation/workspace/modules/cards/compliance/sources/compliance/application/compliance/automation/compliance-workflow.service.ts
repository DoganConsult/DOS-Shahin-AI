import { logger } from '../../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { emitComplianceEvent } from './compliance-event.service';

export interface ComplianceWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: ComplianceWorkflowContext): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, created_at)
     VALUES ($1, $2, 'workflow_triggered', $3, $4, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null],
  );
  emitComplianceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'status_changed',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { trigger: 'workflow_start' },
  });
  logger.info('[Compliance] workflow triggered', { entityType: ctx.entityType, entityId: ctx.entityId });
}

export async function onTaskCreated(ctx: ComplianceWorkflowContext, taskId: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'task_created', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ taskId })],
  );
  logger.info('[Compliance] task created', { entityType: ctx.entityType, entityId: ctx.entityId, taskId });
}

export async function onApprovalRequired(ctx: ComplianceWorkflowContext, approverRole: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'approval_required', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ approverRole })],
  );
  await createProcessTask(ctx.tenantId, {
    title: `Approval required: ${ctx.entityType} review`,
    description: `Compliance ${ctx.entityType} ${ctx.entityId} requires approval by ${approverRole}.`,
    taskType: 'approval',
    priority: 'high',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    triggerSource: 'compliance.approval_required',
  });
  emitComplianceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'escalated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { approverRole, trigger: 'approval_hook' },
  });
  logger.info('[Compliance] approval required', { entityType: ctx.entityType, entityId: ctx.entityId, approverRole });
}

export async function onEscalation(ctx: ComplianceWorkflowContext, reason: string, escalateTo: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'escalated', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ reason, escalateTo })],
  );
  await createProcessTask(ctx.tenantId, {
    title: `Escalation: ${ctx.entityType} requires attention`,
    description: `Compliance ${ctx.entityType} ${ctx.entityId} escalated: ${reason}. Escalated to ${escalateTo}.`,
    taskType: 'escalation',
    priority: 'critical',
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    triggerSource: 'compliance.escalation',
  });
  emitComplianceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'escalated',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { reason, escalateTo, trigger: 'escalation_hook' },
  });
  logger.warn('[Compliance] escalation', { entityType: ctx.entityType, entityId: ctx.entityId, reason, escalateTo });
}

export async function onClosure(ctx: ComplianceWorkflowContext, closureReason: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'closed', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ closureReason })],
  );
  emitComplianceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'status_changed',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    newState: 'closed' as any,
    data: { closureReason, trigger: 'closure_hook' },
  });
  logger.info('[Compliance] closure', { entityType: ctx.entityType, entityId: ctx.entityId, closureReason });
}

export async function onFailure(ctx: ComplianceWorkflowContext, error: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".compliance_activity_log (entity_type, entity_id, action, triggered_by, correlation_id, metadata, created_at)
     VALUES ($1, $2, 'workflow_failed', $3, $4, $5, NOW())`,
    [ctx.entityType, ctx.entityId, ctx.triggeredBy, ctx.correlationId || null, JSON.stringify({ error })],
  );
  emitComplianceEvent({
    tenantId: ctx.tenantId,
    entityType: ctx.entityType as any,
    entityId: ctx.entityId,
    action: 'status_changed',
    triggeredBy: ctx.triggeredBy,
    correlationId: ctx.correlationId,
    data: { error, trigger: 'failure_compensation' },
  });
  logger.error('[Compliance] workflow failure', { entityType: ctx.entityType, entityId: ctx.entityId, error });
}
