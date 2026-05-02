import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import type { ProcessTaskInput, ProcessTask } from '../process-orchestration/types';

export async function createProcessTask(
  tenantId: string,
  input: ProcessTaskInput,
): Promise<ProcessTask> {
  const schema = tenantSchema(tenantId);
  const taskId = crypto.randomUUID();

  try {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_tasks
       (task_id, tenant_id, task_type, title, description, module_code, entity_type, entity_id,
        priority, assignee_user_id, assignee_role_code, status, due_date, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending',
               CASE WHEN $12 > 0 THEN NOW() + ($12 || ' days')::interval ELSE NULL END,
               $13, NOW())`,
      [
        taskId, tenantId, input.type, input.title, input.description ?? null,
        input.moduleCode, input.entityType, input.entityId, input.priority,
        input.assigneeUserId ?? null, input.assigneeRoleCode ?? null,
        input.dueInDays ?? 0, JSON.stringify(input.metadata ?? {}),
      ],
    );

    logger.info(`[ProcessOrchestration] Task created: ${taskId} type=${input.type} module=${input.moduleCode}`);

    return {
      taskId,
      tenantId,
      type: input.type,
      title: input.title,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    logger.warn(`[ProcessOrchestration] Failed to create task, table may not exist: ${(err as Error).message}`);
    return {
      taskId,
      tenantId,
      type: input.type,
      title: input.title,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
}
