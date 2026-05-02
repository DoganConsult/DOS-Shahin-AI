/**
 * Process-task completion — marks a process task as completed, emits the
 * canonical `workflow.task.task_completed` event, and records the completion
 * in the tenant's `process_tasks` table. Used by orchestration flows that
 * advance a workflow after a human-in-the-loop task is closed.
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface CompleteProcessTaskInput {
  tenantId: string;
  taskId: string;
  completedBy: string;
  outcome?: string;
  notes?: string;
  data?: Record<string, unknown>;
}

export interface CompleteProcessTaskResult {
  taskId: string;
  status: 'completed' | 'not_found' | 'failed';
  completedAt?: string;
  error?: string;
}

export async function completeProcessTask(
  input: CompleteProcessTaskInput,
): Promise<CompleteProcessTaskResult> {
  const schema = tenantSchema(input.tenantId);
  const completedAt = new Date().toISOString();
  try {
    const res = await safeQuery(
      `UPDATE "${schema}".process_tasks
         SET status = 'completed',
             completed_by = $2,
             completed_at = NOW(),
             outcome = $3,
             notes = COALESCE($4, notes)
       WHERE id = $1
       RETURNING id, status`,
      [input.taskId, input.completedBy, input.outcome ?? null, input.notes ?? null],
    );

    if (res.rows.length === 0) {
      return { taskId: input.taskId, status: 'not_found' };
    }

    await publish(
      'workflow.task.task_completed',
      input.tenantId,
      {
        taskId: input.taskId,
        completedBy: input.completedBy,
        outcome: input.outcome,
        data: input.data,
        completedAt,
      },
      { userId: input.completedBy, entityType: 'task', entityId: input.taskId, category: 'workflow' },
    );

    return { taskId: input.taskId, status: 'completed', completedAt };
  } catch (err) {
    logger.warn('[TaskCompletion] completeProcessTask failed', {
      tenantId: input.tenantId,
      taskId: input.taskId,
      error: toErrorMessage(err),
    });
    return {
      taskId: input.taskId,
      status: 'failed',
      error: toErrorMessage(err),
    };
  }
}
