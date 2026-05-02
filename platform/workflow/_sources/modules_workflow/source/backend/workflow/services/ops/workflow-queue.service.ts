import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export interface QueueTask {
  taskId: string;
  source: 'workflow_tasks' | 'process_tasks';
  title: string;
  description: string | null;
  taskType: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  instanceStepId: string | null;
  entityType: string | null;
  entityId: string | null;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  taskType?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

export async function getMyTasks(
  tenantId: string,
  userId: string,
  filters: TaskFilters = {},
): Promise<QueueTask[]> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(filters.limit || 100, 500);
  const offset = filters.offset || 0;

  const wfWhere: string[] = ["wt.assigned_to = $1", "wt.deleted_at IS NULL"];
  const ptWhere: string[] = ["pt.assignee_key = $1", "pt.deleted_at IS NULL"];
  const params: (string | number)[] = [userId];
  let idx = 2;

  if (filters.status) {
    wfWhere.push(`wt.status = $${idx}`);
    ptWhere.push(`pt.status = $${idx}`);
    params.push(filters.status);
    idx++;
  }
  if (filters.priority) {
    wfWhere.push(`wt.priority = $${idx}`);
    ptWhere.push(`pt.priority = $${idx}`);
    params.push(filters.priority);
    idx++;
  }
  if (filters.taskType) {
    wfWhere.push(`wt.task_type = $${idx}`);
    ptWhere.push(`pt.task_type = $${idx}`);
    params.push(filters.taskType);
    idx++;
  }
  if (filters.overdue) {
    wfWhere.push("wt.due_date < NOW()");
    ptWhere.push("pt.due_date < NOW()");
  }

  params.push(limit, offset);
  const limitIdx = idx;
  const offsetIdx = idx + 1;

  const sql = `
    (SELECT wt.task_id::text, 'workflow_tasks' AS source, wt.title, wt.description,
            wt.task_type, wt.status, wt.priority, wt.assigned_to, wt.due_date::text,
            wt.created_at::text, wt.instance_step_id::text, 'workflow_instance' AS entity_type, wis.instance_id::text AS entity_id
     FROM "${schema}".workflow_tasks wt
     LEFT JOIN "${schema}".workflow_instance_steps wis ON wis.instance_step_id = wt.instance_step_id
     WHERE ${wfWhere.join(" AND ")}
    )
    UNION ALL
    (SELECT pt.task_id::text, 'process_tasks' AS source, pt.title, pt.description,
            pt.task_type, pt.status, pt.priority, pt.assignee_key AS assigned_to, pt.due_date::text,
            pt.created_at::text, NULL AS instance_step_id, pt.entity_type, pt.entity_id::text
     FROM "${schema}".process_tasks pt
     WHERE ${ptWhere.join(" AND ")}
    )
    ORDER BY created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const result = await safeQuery(sql, params);
  return result.rows.map(mapQueueRow);
}

export async function getTeamQueue(
  tenantId: string,
  roleCode: string,
  filters: TaskFilters = {},
): Promise<QueueTask[]> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(filters.limit || 100, 500);
  const offset = filters.offset || 0;

  const wfWhere: string[] = ["wt.deleted_at IS NULL"];
  const ptWhere: string[] = ["pt.deleted_at IS NULL"];
  const params: (string | number)[] = [roleCode];
  let idx = 2;

  wfWhere.push(`(wt.assigned_to = $1 OR wt.assigned_to IS NULL)`);
  ptWhere.push(`(pt.assignee_key = $1 OR pt.assigned_team_id = $1)`);

  if (filters.status) {
    wfWhere.push(`wt.status = $${idx}`);
    ptWhere.push(`pt.status = $${idx}`);
    params.push(filters.status);
    idx++;
  }
  if (filters.priority) {
    wfWhere.push(`wt.priority = $${idx}`);
    ptWhere.push(`pt.priority = $${idx}`);
    params.push(filters.priority);
    idx++;
  }
  if (filters.overdue) {
    wfWhere.push("wt.due_date < NOW()");
    ptWhere.push("pt.due_date < NOW()");
  }

  params.push(limit, offset);
  const limitIdx = idx;
  const offsetIdx = idx + 1;

  const sql = `
    (SELECT wt.task_id::text, 'workflow_tasks' AS source, wt.title, wt.description,
            wt.task_type, wt.status, wt.priority, wt.assigned_to, wt.due_date::text,
            wt.created_at::text, wt.instance_step_id::text, NULL AS entity_type, NULL AS entity_id
     FROM "${schema}".workflow_tasks wt
     WHERE ${wfWhere.join(" AND ")}
    )
    UNION ALL
    (SELECT pt.task_id::text, 'process_tasks' AS source, pt.title, pt.description,
            pt.task_type, pt.status, pt.priority, pt.assignee_key AS assigned_to, pt.due_date::text,
            pt.created_at::text, NULL AS instance_step_id, pt.entity_type, pt.entity_id::text
     FROM "${schema}".process_tasks pt
     WHERE ${ptWhere.join(" AND ")}
    )
    ORDER BY created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const result = await safeQuery(sql, params);
  return result.rows.map(mapQueueRow);
}

export async function claimTask(
  tenantId: string,
  taskId: string,
  userId: string,
): Promise<QueueTask | null> {
  const schema = tenantSchema(tenantId);

  const wfResult = await safeQuery(
    `UPDATE "${schema}".workflow_tasks
     SET assigned_to = $2, status = 'in_progress', updated_at = NOW(), updated_by = $2
     WHERE task_id = $1 AND (assigned_to IS NULL OR assigned_to = $2) AND status = 'open'
     RETURNING *`,
    [taskId, userId],
  );

  if (wfResult.rows.length > 0) {
    return mapQueueRow({ ...getFirstRow(wfResult), source: 'workflow_tasks' });
  }

  const ptResult = await safeQuery(
    `UPDATE "${schema}".process_tasks
     SET assignee_key = $2, status = 'in_progress', updated_at = NOW()
     WHERE task_id = $1 AND (assignee_key IS NULL OR assignee_key = $2) AND status IN ('pending', 'open')
     RETURNING *`,
    [taskId, userId],
  );

  if (ptResult.rows.length > 0) {
    return mapQueueRow({ ...getFirstRow(ptResult), source: 'process_tasks', assigned_to: getFirstRow(ptResult)?.assignee_key });
  }

  return null;
}

export async function releaseTask(
  tenantId: string,
  taskId: string,
): Promise<QueueTask | null> {
  const schema = tenantSchema(tenantId);

  const wfResult = await safeQuery(
    `UPDATE "${schema}".workflow_tasks
     SET assigned_to = NULL, status = 'open', updated_at = NOW()
     WHERE task_id = $1 AND status = 'in_progress'
     RETURNING *`,
    [taskId],
  );
  if (wfResult.rows.length > 0) {
    return mapQueueRow({ ...getFirstRow(wfResult), source: 'workflow_tasks' });
  }

  const ptResult = await safeQuery(
    `UPDATE "${schema}".process_tasks
     SET assignee_key = NULL, status = 'open', updated_at = NOW()
     WHERE task_id = $1 AND status = 'in_progress'
     RETURNING *`,
    [taskId],
  );
  if (ptResult.rows.length > 0) {
    return mapQueueRow({ ...getFirstRow(ptResult), source: 'process_tasks' });
  }

  return null;
}

export async function getQueueStats(
  tenantId: string,
  userId?: string,
): Promise<{ total: number; open: number; overdue: number; byPriority: Record<string, number> }> {
  const schema = tenantSchema(tenantId);
  // Parameterized query — never interpolate userId directly (SQL injection risk)
  const params: string[] = [];
  let paramIdx = 1;
  const userFilter = userId ? `AND assigned_to = $${paramIdx++}` : '';
  const ptUserFilter = userId ? `AND assignee_key = $${paramIdx++}` : '';
  if (userId) { params.push(userId); if (userFilter && ptUserFilter) params.push(userId); }

  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('open','pending'))::int AS open,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed','cancelled'))::int AS overdue,
      COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
      COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
      COUNT(*) FILTER (WHERE priority = 'low')::int AS low
    FROM (
      SELECT status, due_date, priority, assigned_to FROM "${schema}".workflow_tasks
        WHERE deleted_at IS NULL ${userFilter}
      UNION ALL
      SELECT status, due_date, priority, assignee_key AS assigned_to FROM "${schema}".process_tasks
        WHERE deleted_at IS NULL ${ptUserFilter}
    ) combined
  `, params);

  const r = getFirstRow(result) || {};
  return {
    total: r.total || 0,
    open: r.open || 0,
    overdue: r.overdue || 0,
    byPriority: { critical: r.critical || 0, high: r.high || 0, medium: r.medium || 0, low: r.low || 0 },
  };
}

function mapQueueRow(r: Record<string, unknown>): QueueTask {
  return {
    taskId: String(r.task_id),
    source: (r.source as QueueTask['source']) || 'workflow_tasks',
    title: String(r.title || ''),
    description: r.description ? String(r.description) : null,
    taskType: r.task_type ? String(r.task_type) : null,
    status: String(r.status || 'open'),
    priority: String(r.priority || 'medium'),
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    dueDate: r.due_date ? String(r.due_date) : null,
    createdAt: String(r.created_at || ''),
    instanceStepId: r.instance_step_id ? String(r.instance_step_id) : null,
    entityType: r.entity_type ? String(r.entity_type) : null,
    entityId: r.entity_id ? String(r.entity_id) : null,
  };
}
