/**
 * WorkflowExecutionService — Real implementation
 * Extracted from workflow-service/src/domain/workflow.service.ts
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type WorkflowStatus = 'pending' | 'in_progress' | 'awaiting_review' | 'completed' | 'cancelled' | 'failed';

export interface WorkflowExecutionContext {
  instanceId: string;
  tenantId: string;
  workflowType: string;
  currentStep: string | null;
  context: Record<string, unknown>;
  actorId: string;
}

export async function executeWorkflowStep(
  ctx: WorkflowExecutionContext,
  stepName: string,
  outcome?: Record<string, unknown>,
): Promise<{ success: boolean; nextStep: string | null }> {
  try {
    const stepId = randomUUID();
    await safeQuery(
      `INSERT INTO __TENANT_SCHEMA__.workflow_steps
         (id, instance_id, tenant_id, step_name, step_order, status, started_at, metadata)
       SELECT $1, $2, $3, $4,
              COALESCE((SELECT MAX(step_order) + 1 FROM __TENANT_SCHEMA__.workflow_steps WHERE instance_id = $2), 1),
              'in_progress', NOW(), $5
       ON CONFLICT DO NOTHING`,
      [stepId, ctx.instanceId, ctx.tenantId, stepName, JSON.stringify(outcome || {})],
    );

    await safeQuery(
      `UPDATE __TENANT_SCHEMA__.workflow_instances
       SET current_step = $1, status = 'in_progress', updated_at = NOW()
       WHERE instance_id = $2 AND tenant_id = $3`,
      [stepName, ctx.instanceId, ctx.tenantId],
    );

    logger.info('[WorkflowExecution] Step executed', {
      instanceId: ctx.instanceId,
      stepName,
      tenantId: ctx.tenantId,
    });

    return { success: true, nextStep: null };
  } catch (err) {
    logger.error('[WorkflowExecution] Step execution failed', {
      instanceId: ctx.instanceId,
      stepName,
      error: String(err),
    });
    return { success: false, nextStep: null };
  }
}

export async function completeWorkflowStep(
  instanceId: string,
  tenantId: string,
  stepName: string,
  result: 'pass' | 'fail' | 'skip',
  notes?: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.workflow_steps
     SET status = $1, completed_at = NOW(), outcome = $2, notes = $3, updated_at = NOW()
     WHERE instance_id = $4 AND tenant_id = $5 AND step_name = $6 AND status = 'in_progress'`,
    [result === 'skip' ? 'skipped' : result === 'fail' ? 'failed' : 'completed',
     result, notes || null, instanceId, tenantId, stepName],
  );
}

export async function transitionWorkflow(
  instanceId: string,
  tenantId: string,
  fromStep: string | null,
  toStep: string,
  toStatus: WorkflowStatus,
  triggeredBy: string,
  triggerType: 'manual' | 'automatic' | 'system' | 'ai' = 'manual',
  notes?: string,
): Promise<void> {
  const transitionId = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.workflow_transitions
       (id, instance_id, tenant_id, from_step, to_step, from_status, to_status, triggered_by, trigger_type, notes)
     SELECT $1, $2, $3, $4, $5, wi.status, $6, $7, $8, $9
     FROM __TENANT_SCHEMA__.workflow_instances wi
     WHERE wi.instance_id = $2 AND wi.tenant_id = $3`,
    [transitionId, instanceId, tenantId, fromStep, toStep, toStatus, triggeredBy, triggerType, notes || null],
  );

  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.workflow_instances
     SET current_step = $1, status = $2, updated_at = NOW()
     WHERE instance_id = $3 AND tenant_id = $4`,
    [toStep, toStatus, instanceId, tenantId],
  );

  logger.info('[WorkflowExecution] Workflow transitioned', {
    instanceId, tenantId, fromStep, toStep, toStatus, triggeredBy,
  });
}

export async function getWorkflowSteps(
  instanceId: string,
  tenantId: string,
): Promise<Array<{ id: string; step_name: string; status: string; completed_at: string | null }>> {
  const result = await safeQuery(
    `SELECT id, step_name, step_order, status, assigned_to, started_at, completed_at, outcome, notes
     FROM __TENANT_SCHEMA__.workflow_steps
     WHERE instance_id = $1 AND tenant_id = $2
     ORDER BY step_order ASC`,
    [instanceId, tenantId],
  );
  return result.rows as Array<{ id: string; step_name: string; status: string; completed_at: string | null }>;
}

export async function logWorkflowEvent(
  instanceId: string,
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>,
  actorId?: string,
): Promise<void> {
  const eventId = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.workflow_event_log
       (id, instance_id, tenant_id, event_type, payload, actor_id, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, gen_random_uuid())`,
    [eventId, instanceId, tenantId, eventType, JSON.stringify(payload), actorId || null],
  );
}
