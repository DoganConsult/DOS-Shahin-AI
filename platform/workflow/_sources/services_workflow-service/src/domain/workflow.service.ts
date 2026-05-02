import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

function tbl(tenantId: string, table: string): string {
  return `"${tenantSchema(tenantId)}"."${table}"`;
}

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkflowInstance {
  instance_id: string;
  tenant_id: string;
  workflow_type: string;
  name: string | null;
  status: WorkflowStatus;
  current_step: string | null;
  total_steps: number;
  created_by: string;
  entity_type: string | null;
  entity_id: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface CreateWorkflowInput {
  tenantId: string;
  workflowType: string;
  name?: string;
  createdBy: string;
  entityType?: string;
  entityId?: string;
  context?: Record<string, unknown>;
}

export interface UpdateWorkflowInput {
  name?: string;
  context?: Record<string, unknown>;
}

export interface ListWorkflowInput {
  tenantId: string;
  limit: number;
  offset: number;
  status?: string;
}

const WF_COLUMNS = `instance_id, tenant_id, workflow_type, name, status, current_step, total_steps,
              created_by, entity_type, entity_id, context, created_at, updated_at, completed_at, cancelled_at, cancel_reason`;

export async function getWorkflowInstance(instanceId: string, tenantId: string): Promise<WorkflowInstance | null> {
  try {
    const result = await safeQuery(
      `SELECT ${WF_COLUMNS}
       FROM ${tbl(tenantId, 'workflow_instances')}
       WHERE instance_id = $1`,
      [instanceId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowInstance;
  } catch (err) {
    logger.error('[Workflow] Failed to fetch workflow instance', { instanceId, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function createWorkflowInstance(input: CreateWorkflowInput): Promise<WorkflowInstance> {
  const instanceId = randomUUID();
  const context = input.context ? JSON.stringify(input.context) : '{}';

  try {
    await safeQuery(
      `INSERT INTO ${tbl(input.tenantId, 'workflow_instances')}
         (instance_id, workflow_type, name, status, current_step, total_steps,
          created_by, entity_type, entity_id, context, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NULL, 0, $4, $5, $6, $7, NOW(), NOW())`,
      [instanceId, input.workflowType, input.name || null, input.createdBy, input.entityType || null, input.entityId || null, context],
    );

    logger.info('[Workflow] Workflow instance created', { instanceId, tenantId: input.tenantId, workflowType: input.workflowType });

    const instance = await getWorkflowInstance(instanceId, input.tenantId);
    if (!instance) throw new Error('Failed to retrieve created workflow instance');
    return instance;
  } catch (err) {
    logger.error('[Workflow] Failed to create workflow instance', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function updateWorkflowInstance(
  instanceId: string,
  tenantId: string,
  updates: UpdateWorkflowInput,
): Promise<WorkflowInstance | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx}`);
    params.push(updates.name);
    idx++;
  }
  if (updates.context !== undefined) {
    setClauses.push(`context = $${idx}`);
    params.push(JSON.stringify(updates.context));
    idx++;
  }

  if (setClauses.length === 0) {
    return getWorkflowInstance(instanceId, tenantId);
  }

  setClauses.push('updated_at = NOW()');
  params.push(instanceId);

  try {
    const result = await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_instances')} SET ${setClauses.join(', ')} WHERE instance_id = $${idx} AND status != 'cancelled'`,
      params,
    );

    if ((result.rowCount || 0) === 0) {
      logger.warn('[Workflow] Workflow instance not found or cancelled for update', { instanceId, tenantId });
      return null;
    }

    logger.info('[Workflow] Workflow instance updated', { instanceId, tenantId, fields: Object.keys(updates) });
    return getWorkflowInstance(instanceId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to update workflow instance', { instanceId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listWorkflowInstances(input: ListWorkflowInput): Promise<{ data: WorkflowInstance[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.status) {
    conditions.push(`status = $${idx}`);
    params.push(input.status);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;
  const table = tbl(input.tenantId, 'workflow_instances');

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
      params,
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${WF_COLUMNS}
       FROM ${table} ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as WorkflowInstance[], total };
  } catch (err) {
    logger.error('[Workflow] Failed to list workflow instances', { tenantId: input.tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function advanceWorkflowInstance(
  instanceId: string,
  tenantId: string,
  actorId: string,
  nextStepName?: string,
): Promise<WorkflowInstance | null> {
  try {
    const instance = await getWorkflowInstance(instanceId, tenantId);
    if (!instance) return null;

    const stepVal = nextStepName || 'next';

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_instances')}
       SET current_step = $1, status = 'in_progress', updated_at = NOW()
       WHERE instance_id = $2`,
      [stepVal, instanceId],
    );

    logger.info('[Workflow] Workflow instance advanced', { instanceId, tenantId, actorId, currentStep: stepVal });
    return getWorkflowInstance(instanceId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to advance workflow instance', { instanceId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function completeWorkflowInstance(
  instanceId: string,
  tenantId: string,
  actorId: string,
): Promise<WorkflowInstance | null> {
  try {
    const instance = await getWorkflowInstance(instanceId, tenantId);
    if (!instance) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_instances')}
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE instance_id = $1 AND status NOT IN ('completed', 'cancelled')`,
      [instanceId],
    );

    logger.info('[Workflow] Workflow instance completed', { instanceId, tenantId, actorId });
    return getWorkflowInstance(instanceId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to complete workflow instance', { instanceId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function cancelWorkflowInstance(
  instanceId: string,
  tenantId: string,
  reason?: string,
): Promise<WorkflowInstance | null> {
  try {
    const instance = await getWorkflowInstance(instanceId, tenantId);
    if (!instance) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_instances')}
       SET status = 'cancelled', cancel_reason = $1, cancelled_at = NOW(), updated_at = NOW()
       WHERE instance_id = $2`,
      [reason || null, instanceId],
    );

    logger.info('[Workflow] Workflow instance cancelled', { instanceId, tenantId, reason });
    return getWorkflowInstance(instanceId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to cancel workflow instance', { instanceId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export const WorkflowService = {
  getWorkflowInstance,
  createWorkflowInstance,
  updateWorkflowInstance,
  listWorkflowInstances,
  advanceWorkflowInstance,
  completeWorkflowInstance,
  cancelWorkflowInstance,
};
