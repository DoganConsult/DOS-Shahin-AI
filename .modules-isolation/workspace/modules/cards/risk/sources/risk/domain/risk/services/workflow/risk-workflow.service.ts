import { safeQuery, tenantSchema } from '../../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../ports/logger.port';

export interface RiskWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(ctx: RiskWorkflowContext): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  logger.info('[risk-workflow] triggered', { entityId: ctx.entityId, entityType: ctx.entityType, triggeredBy: ctx.triggeredBy });
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'workflow_triggered', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ correlationId: ctx.correlationId })],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function onTaskCreated(ctx: RiskWorkflowContext, taskId: string): Promise<void> {
  logger.info('[risk-workflow] task created', { entityId: ctx.entityId, taskId });
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'task_created', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ taskId })],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function onApprovalRequired(ctx: RiskWorkflowContext, approverRole: string): Promise<void> {
  logger.info('[risk-workflow] approval required', { entityId: ctx.entityId, approverRole });
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'approval_required', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ approverRole })],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function onEscalation(ctx: RiskWorkflowContext, reason: string, escalateTo: string): Promise<void> {
  logger.warn('[risk-workflow] escalation', { entityId: ctx.entityId, reason, escalateTo });
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'escalation', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ reason, escalateTo })],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function onClosure(ctx: RiskWorkflowContext, closureReason: string): Promise<void> {
  logger.info('[risk-workflow] closure', { entityId: ctx.entityId, closureReason });
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'workflow_closed', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ closureReason })],
  ).catch(catchHandler(EC.EVENT_BUS));
}

export async function onFailure(ctx: RiskWorkflowContext, error: string): Promise<void> {
  logger.error('[risk-workflow] failure', { entityId: ctx.entityId, error });
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state)
     VALUES ($1, $2, 'risk', 'workflow_failed', $3, $4, '{}', $5)`,
    [ctx.tenantId, ctx.triggeredBy, ctx.entityType, ctx.entityId, JSON.stringify({ error })],
  ).catch(catchHandler(EC.EVENT_BUS));
}
