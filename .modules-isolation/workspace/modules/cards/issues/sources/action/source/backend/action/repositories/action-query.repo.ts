import { safeQuery, tenantSchema } from '../ports/database.port';
import { ACTION_BUSINESS_THRESHOLDS as _ACTION_BUSINESS_THRESHOLDS } from '../data/action-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".action_action_items
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  total: number;
  active: number;
  overdue: number;
  completionRate: number;
  avgCompletionDays: number;
  onTimeRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived'))::int AS active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('completed', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS completion_rate,
      COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status = 'completed'), 0)::int AS avg_completion,
      CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status = 'completed' AND (due_date IS NULL OR updated_at <= due_date))::numeric /
          COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100, 2)
        ELSE 0
      END AS on_time_rate
    FROM "${schema}".action_action_items WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    overdue: row.overdue || 0,
    completionRate: Number(row.completion_rate) || 0,
    avgCompletionDays: row.avg_completion || 0,
    onTimeRate: Number(row.on_time_rate) || 0,
  };
}

export async function getSourceBreakdown(tenantId: string): Promise<Array<{
  sourceType: string; count: number; overdueCount: number; completedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(source_type, 'manual') AS source_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue_count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
    FROM "${schema}".action_action_items WHERE deleted_at IS NULL
    GROUP BY source_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    sourceType: r.source_type,
    count: r.count,
    overdueCount: r.overdue_count,
    completedCount: r.completed_count,
  }));
}

export async function getPriorityBreakdown(tenantId: string): Promise<Array<{
  priority: string; count: number; overdueCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(priority, 'medium') AS priority,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue_count
    FROM "${schema}".action_action_items WHERE deleted_at IS NULL
    GROUP BY priority
    ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    priority: r.priority,
    count: r.count,
    overdueCount: r.overdue_count,
  }));
}

export async function getAssigneeWorkload(tenantId: string): Promise<Array<{
  assignedTo: string; totalActions: number; openActions: number; overdueActions: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      assigned_to,
      COUNT(*)::int AS total_actions,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived'))::int AS open_actions,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue_actions
    FROM "${schema}".action_action_items
    WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
    GROUP BY assigned_to ORDER BY overdue_actions DESC, open_actions DESC LIMIT 50
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    assignedTo: r.assigned_to,
    totalActions: r.total_actions,
    openActions: r.open_actions,
    overdueActions: r.overdue_actions,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '0-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '365 days' THEN '91-365d'
        ELSE '365d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".action_action_items
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  priority?: string;
  sourceType?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const sortBy = params.sortBy || 'created_at';
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (params.query) { conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.priority) { conditions.push(`priority = $${idx}`); values.push(params.priority); idx++; }
  if (params.sourceType) { conditions.push(`source_type = $${idx}`); values.push(params.sourceType); idx++; }
  if (params.assignedTo) { conditions.push(`assigned_to = $${idx}`); values.push(params.assignedTo); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".action_action_items WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".action_action_items WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.priority) { conditions.push(`priority = $${idx}`); values.push(filters.priority); idx++; }
  if (filters?.sourceType) { conditions.push(`source_type = $${idx}`); values.push(filters.sourceType); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".action_action_items WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT a.id, a.title, a.status, a.priority, a.source_type, a.assigned_to, a.due_date,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".action_action_items a
    JOIN "${schema}".entity_links el ON el.source_entity_id = a.id AND el.source_module = 'action'
    WHERE a.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY a.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
