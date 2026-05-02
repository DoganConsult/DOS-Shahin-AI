import { safeQuery, tenantSchema } from '@dos/db';

function tbl(tenantId: string, table: string): string {
  return `"${tenantSchema(tenantId)}"."${table}"`;
}

export interface WorkItem {
  work_item_id: string;
  source: string;
  source_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  entity_type: string | null;
  entity_id: string | null;
  context: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface WorkItemFilters {
  tenantId: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  taskType?: string;
  source?: string;
  workspaceId?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

export async function getMyWorkItems(
  filters: WorkItemFilters,
): Promise<{ tasks: WorkItem[]; count: number }> {
  const params: unknown[] = [];
  const table = tbl(filters.tenantId, 'work_items');
  const conditions: string[] = ['wi.is_deleted = FALSE'];

  if (filters.assignedTo) {
    params.push(filters.assignedTo);
    conditions.push(`wi.assigned_to = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`wi.status = $${params.length}`);
  }

  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`wi.priority = $${params.length}`);
  }

  if (filters.taskType) {
    params.push(filters.taskType);
    conditions.push(`wi.task_type = $${params.length}`);
  }

  if (filters.source) {
    params.push(filters.source);
    conditions.push(`wi.source = $${params.length}`);
  }

  if (filters.workspaceId) {
    params.push(filters.workspaceId);
    conditions.push(`wi.context->>'workspaceId' = $${params.length}`);
  }

  if (filters.overdue) {
    conditions.push(`wi.due_date < NOW() AND wi.status NOT IN ('completed', 'cancelled')`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS count FROM ${table} wi ${where}`,
    params,
  );

  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;
  params.push(limit, offset);

  const dataResult = await safeQuery(
    `SELECT wi.work_item_id, wi.source, wi.source_id, wi.title, wi.description,
            wi.task_type, wi.status, wi.priority, wi.assigned_to, wi.due_date,
            wi.entity_type, wi.entity_id, wi.context, wi.created_at, wi.completed_at
     FROM ${table} wi
     ${where}
     ORDER BY
       CASE wi.priority
         WHEN 'critical' THEN 0
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END,
       wi.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    tasks: dataResult.rows as WorkItem[],
    count: countResult.rows[0]?.count ?? 0,
  };
}

export async function getMyWorkItemsUnified(
  tenantId: string,
  userId: string,
  filters: { status?: string; priority?: string; taskType?: string; overdue?: boolean; limit?: number },
): Promise<{ tasks: WorkItem[]; count: number }> {
  const directResult = await getMyWorkItems({
    tenantId,
    assignedTo: userId,
    ...filters,
  });

  if (directResult.count > 0) {
    return directResult;
  }

  const params: unknown[] = [userId];
  const conditions: string[] = ['wt.assigned_to = $1', 'wt.is_deleted = FALSE'];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`wt.status = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit || 50, 200);
  params.push(limit);

  const fallbackResult = await safeQuery(
    `SELECT wt.task_id AS work_item_id,
            'workflow_tasks' AS source,
            wt.instance_id AS source_id,
            wt.title,
            wt.description,
            'workflow' AS task_type,
            wt.status,
            wt.priority,
            wt.assigned_to,
            wt.due_date,
            NULL AS entity_type,
            NULL AS entity_id,
            wt.created_at,
            wt.completed_at
     FROM ${tbl(tenantId, 'workflow_tasks')} wt
     ${where}
     ORDER BY wt.created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return {
    tasks: fallbackResult.rows as WorkItem[],
    count: fallbackResult.rows.length,
  };
}

export async function createWorkItem(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    taskType?: string;
    source?: string;
    sourceId?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
    entityType?: string;
    entityId?: string;
    context?: Record<string, unknown>;
  },
): Promise<WorkItem> {
  const result = await safeQuery(
    `INSERT INTO ${tbl(tenantId, 'work_items')}
       (title, description, task_type, source, source_id,
        priority, assigned_to, due_date, entity_type, entity_id, context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING work_item_id, source, source_id, title, description,
               task_type, status, priority, assigned_to, due_date,
               entity_type, entity_id, created_at, completed_at`,
    [
      data.title,
      data.description ?? null,
      data.taskType ?? null,
      data.source ?? 'manual',
      data.sourceId ?? null,
      data.priority ?? 'medium',
      data.assignedTo ?? null,
      data.dueDate ?? null,
      data.entityType ?? null,
      data.entityId ?? null,
      data.context ? JSON.stringify(data.context) : '{}',
    ],
  );
  return result.rows[0] as WorkItem;
}

export async function completeWorkItem(
  tenantId: string,
  workItemId: string,
  completedBy: string,
  outcome?: string,
  comment?: string,
): Promise<WorkItem | null> {
  const result = await safeQuery(
    `UPDATE ${tbl(tenantId, 'work_items')}
     SET status = 'completed',
         completed_at = NOW(),
         completed_by = $2,
         context = context || $3::jsonb,
         updated_at = NOW()
     WHERE work_item_id = $1
       AND is_deleted = FALSE
       AND status NOT IN ('completed', 'cancelled')
     RETURNING work_item_id, source, source_id, title, description,
               task_type, status, priority, assigned_to, due_date,
               entity_type, entity_id, created_at, completed_at`,
    [
      workItemId,
      completedBy,
      JSON.stringify({ outcome: outcome ?? null, comment: comment ?? null }),
    ],
  );
  return (result.rows[0] as WorkItem) || null;
}
