import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

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
       FROM dos.workflow_tasks
       WHERE task_id = $1 AND tenant_id = $2`,
      [taskId, tenantId],
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
  const result = await safeQuery(
    `INSERT INTO dos.workflow_tasks
       (task_id, tenant_id, instance_id, task_type, title, description, status,
        due_at, context, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, NOW(), NOW())
     RETURNING ${TASK_COLUMNS}`,
    [
      taskId,
      input.tenantId,
      input.instanceId,
      input.taskType,
      input.title,
      input.description ?? null,
      input.dueAt ?? null,
      input.context ?? {},
    ],
  );
  return result.rows[0] as WorkflowTask;
}

export async function listTasks(input: ListTasksInput): Promise<{ data: WorkflowTask[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [input.tenantId];
  let idx = 2;

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

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.workflow_tasks ${where}`,
      params,
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${TASK_COLUMNS}
       FROM dos.workflow_tasks ${where}
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
      `UPDATE dos.workflow_tasks
       SET assigned_to = $1, assigned_by = $2, status = 'assigned', updated_at = NOW()
       WHERE task_id = $3 AND tenant_id = $4`,
      [assignTo, assignedBy || null, taskId, tenantId],
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
      `UPDATE dos.workflow_tasks
       SET status = 'completed', completed_by = $1, outcome = $2, notes = $3,
           completed_at = NOW(), updated_at = NOW()
       WHERE task_id = $4 AND tenant_id = $5`,
      [completedBy, outcome || null, notes || null, taskId, tenantId],
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
      `UPDATE dos.workflow_tasks
       SET status = 'rejected', completed_by = $1, notes = $2, updated_at = NOW()
       WHERE task_id = $3 AND tenant_id = $4`,
      [rejectedBy, reason || null, taskId, tenantId],
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
      `UPDATE dos.workflow_tasks
       SET assigned_to = $1, assigned_by = $2, status = 'assigned', updated_at = NOW()
       WHERE task_id = $3 AND tenant_id = $4`,
      [toUserId, fromUserId, taskId, tenantId],
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
