import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

function tbl(tenantId: string, table: string): string {
  return `"${tenantSchema(tenantId)}"."${table}"`;
}

export interface WorkflowTask {
  task_id: string;
  tenant_id: string;
  instance_id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  assigned_by: string | null;
  completed_by: string | null;
  outcome: string | null;
  notes: string | null;
  due_at: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateTaskInput {
  tenantId: string;
  instanceId: string;
  taskType: string;
  title: string;
  description?: string;
  dueAt?: string;
  context?: Record<string, unknown>;
}

export interface ListTasksInput {
  tenantId: string;
  limit: number;
  offset: number;
  assignedTo?: string;
  status?: string;
}

const TASK_COLUMNS = `task_id, tenant_id, instance_id, task_type, title, description, status,
              assigned_to, assigned_by, completed_by, outcome, notes, due_at,
              context, created_at, updated_at, completed_at`;

export async function getTask(taskId: string, tenantId: string): Promise<WorkflowTask | null> {
  try {
    const result = await safeQuery(
      `SELECT ${TASK_COLUMNS}
       FROM ${tbl(tenantId, 'workflow_tasks')}
       WHERE task_id = $1`,
      [taskId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowTask;
  } catch (err) {
    logger.error('[Workflow] Failed to fetch task', { taskId, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function createTask(input: CreateTaskInput): Promise<WorkflowTask> {
  const taskId = randomUUID();
  const context = input.context ? JSON.stringify(input.context) : '{}';

  try {
    await safeQuery(
      `INSERT INTO ${tbl(input.tenantId, 'workflow_tasks')}
         (task_id, instance_id, task_type, title, description, status, due_at, context, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, NOW(), NOW())`,
      [taskId, input.instanceId, input.taskType, input.title, input.description || null, input.dueAt || null, context],
    );

    logger.info('[Workflow] Task created', { taskId, tenantId: input.tenantId, instanceId: input.instanceId });

    const task = await getTask(taskId, input.tenantId);
    if (!task) throw new Error('Failed to retrieve created task');
    return task;
  } catch (err) {
    logger.error('[Workflow] Failed to create task', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listTasks(input: ListTasksInput): Promise<{ data: WorkflowTask[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.assignedTo) {
    conditions.push(`assigned_to = $${idx}`);
    params.push(input.assignedTo);
    idx++;
  }
  if (input.status) {
    conditions.push(`status = $${idx}`);
    params.push(input.status);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;
  const table = tbl(input.tenantId, 'workflow_tasks');

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
      params,
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${TASK_COLUMNS}
       FROM ${table} ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as WorkflowTask[], total };
  } catch (err) {
    logger.error('[Workflow] Failed to list tasks', { tenantId: input.tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function assignTask(
  taskId: string,
  tenantId: string,
  assignTo: string,
  assignedBy?: string,
): Promise<WorkflowTask | null> {
  try {
    const task = await getTask(taskId, tenantId);
    if (!task) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_tasks')}
       SET assigned_to = $1, assigned_by = $2, status = 'assigned', updated_at = NOW()
       WHERE task_id = $3`,
      [assignTo, assignedBy || null, taskId],
    );

    logger.info('[Workflow] Task assigned', { taskId, tenantId, assignTo });
    return getTask(taskId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to assign task', { taskId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function completeTask(
  taskId: string,
  tenantId: string,
  completedBy: string,
  outcome?: string,
  notes?: string,
): Promise<WorkflowTask | null> {
  try {
    const task = await getTask(taskId, tenantId);
    if (!task) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_tasks')}
       SET status = 'completed', completed_by = $1, outcome = $2, notes = $3,
           completed_at = NOW(), updated_at = NOW()
       WHERE task_id = $4`,
      [completedBy, outcome || null, notes || null, taskId],
    );

    logger.info('[Workflow] Task completed', { taskId, tenantId, completedBy });
    return getTask(taskId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to complete task', { taskId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function rejectTask(
  taskId: string,
  tenantId: string,
  rejectedBy: string,
  reason?: string,
): Promise<WorkflowTask | null> {
  try {
    const task = await getTask(taskId, tenantId);
    if (!task) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_tasks')}
       SET status = 'rejected', completed_by = $1, notes = $2, updated_at = NOW()
       WHERE task_id = $3`,
      [rejectedBy, reason || null, taskId],
    );

    logger.info('[Workflow] Task rejected', { taskId, tenantId, rejectedBy });
    return getTask(taskId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to reject task', { taskId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function reassignTask(
  taskId: string,
  tenantId: string,
  fromUserId: string,
  toUserId: string,
  reason?: string,
): Promise<WorkflowTask | null> {
  try {
    const task = await getTask(taskId, tenantId);
    if (!task) return null;

    await safeQuery(
      `UPDATE ${tbl(tenantId, 'workflow_tasks')}
       SET assigned_to = $1, assigned_by = $2, status = 'assigned', updated_at = NOW()
       WHERE task_id = $3`,
      [toUserId, fromUserId, taskId],
    );

    logger.info('[Workflow] Task reassigned', { taskId, tenantId, fromUserId, toUserId, reason });
    return getTask(taskId, tenantId);
  } catch (err) {
    logger.error('[Workflow] Failed to reassign task', { taskId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export const TaskService = {
  getTask,
  createTask,
  listTasks,
  assignTask,
  completeTask,
  rejectTask,
  reassignTask,
};
