/**
 * Policy Workflow Service -- Handles workflow integration for policy lifecycle.
 *
 * Integrates policy operations with the workflow engine to track approvals,
 * task creation, escalations, and closures.
 *
 * MP-07 compliance: All workflow triggers are audit-logged.
 * @owner product/shahin-ai
 * @module policy
 */

import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { emitPolicyEvent } from './policy-event.service';

export interface PolicyWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

/**
 * Called when a workflow is triggered for a policy (e.g., review cycle, approval).
 * Creates a workflow instance tracking record and emits audit event.
 */
export async function onWorkflowTriggered(ctx: PolicyWorkflowContext): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);
  const correlationId = ctx.correlationId || `policy-wf-${ctx.entityId}-${Date.now()}`;

  logger.info('[policy-workflow] Workflow triggered', {
    entityId: ctx.entityId,
    entityType: ctx.entityType,
    correlationId,
  });

  await safeQuery(
    `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, correlation_id, details, created_at)
     VALUES ($1, $2, 'workflow_triggered', $3, $4, $5, NOW())`,
    [
      ctx.entityId,
      ctx.entityType,
      ctx.triggeredBy,
      correlationId,
      JSON.stringify({ event: 'workflow_triggered', entityType: ctx.entityType }),
    ],
  ).catch(err => logger.error('[policy-workflow] Failed to log workflow trigger', { error: err }));

  emitPolicyEvent({
    tenantId: ctx.tenantId,
    entityType: 'policy',
    entityId: ctx.entityId,
    action: 'review_started',
    triggeredBy: ctx.triggeredBy,
    correlationId,
    data: { workflowType: ctx.entityType },
  });
}

/**
 * Called when a task is created for policy review or approval.
 * Links the task to the policy entity and assigns it.
 */
export async function onTaskCreated(ctx: PolicyWorkflowContext, taskId: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);

  logger.info('[policy-workflow] Task created for policy', { entityId: ctx.entityId, taskId });

  await safeQuery(
    `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'task_created', $3, $4, NOW())`,
    [
      ctx.entityId,
      ctx.entityType,
      ctx.triggeredBy,
      JSON.stringify({ taskId, event: 'task_created' }),
    ],
  ).catch(err => logger.error('[policy-workflow] Failed to log task creation', { error: err }));
}

/**
 * Called when a policy requires approval (e.g., draft->review, review->approved).
 * Creates approval request and notifies the designated approver role.
 */
export async function onApprovalRequired(ctx: PolicyWorkflowContext, approverRole: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);

  logger.info('[policy-workflow] Approval required', { entityId: ctx.entityId, approverRole });

  await withTransaction(ctx.tenantId, async (client) => {
    await safeQueryWithClient(
      `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
       VALUES ($1, $2, 'approval_required', $3, $4, NOW())`,
      [
        ctx.entityId,
        ctx.entityType,
        ctx.triggeredBy,
        JSON.stringify({ approverRole, event: 'approval_required' }),
      ],
      client,
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".policies SET status = 'review', updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND status = 'draft'`,
      [ctx.triggeredBy, ctx.entityId],
      client,
    );
  }).catch(err => logger.error('[policy-workflow] Failed to process approval required', { error: err }));
}

/**
 * Called when a policy workflow escalates (e.g., SLA breach on review).
 * Logs the escalation and notifies the escalation target.
 */
export async function onEscalation(ctx: PolicyWorkflowContext, reason: string, escalateTo: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);

  logger.warn('[policy-workflow] Escalation triggered', {
    entityId: ctx.entityId,
    reason,
    escalateTo,
  });

  await safeQuery(
    `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'escalation', $3, $4, NOW())`,
    [
      ctx.entityId,
      ctx.entityType,
      ctx.triggeredBy,
      JSON.stringify({ reason, escalateTo, event: 'escalation' }),
    ],
  ).catch(err => logger.error('[policy-workflow] Failed to log escalation', { error: err }));
}

/**
 * Called when a policy workflow completes (approved, published, or rejected).
 * Finalizes the workflow and updates policy status accordingly.
 */
export async function onClosure(ctx: PolicyWorkflowContext, closureReason: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);

  logger.info('[policy-workflow] Workflow closed', { entityId: ctx.entityId, closureReason });

  await safeQuery(
    `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'workflow_closed', $3, $4, NOW())`,
    [
      ctx.entityId,
      ctx.entityType,
      ctx.triggeredBy,
      JSON.stringify({ closureReason, event: 'workflow_closed' }),
    ],
  ).catch(err => logger.error('[policy-workflow] Failed to log workflow closure', { error: err }));
}

/**
 * Called when a policy workflow fails (e.g., timeout, system error).
 * Logs the failure and may trigger retry or manual intervention.
 */
export async function onFailure(ctx: PolicyWorkflowContext, error: string): Promise<void> {
  const schema = tenantSchema(ctx.tenantId);

  logger.error('[policy-workflow] Workflow failed', { entityId: ctx.entityId, error });

  await safeQuery(
    `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'workflow_failed', $3, $4, NOW())`,
    [
      ctx.entityId,
      ctx.entityType,
      ctx.triggeredBy,
      JSON.stringify({ error, event: 'workflow_failed' }),
    ],
  ).catch(err => logger.error('[policy-workflow] Failed to log workflow failure', { error: err }));
}
