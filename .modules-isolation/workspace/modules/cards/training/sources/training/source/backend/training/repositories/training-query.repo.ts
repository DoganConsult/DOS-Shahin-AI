import { safeQuery, tenantSchema } from '../ports/database.port';
import { TRAINING_BUSINESS_THRESHOLDS as _TRAINING_BUSINESS_THRESHOLDS, TRAINING_TIMEOUTS } from '../data/training-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".training_programs
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
  expiringSoon: number;
  avgCompletionDays: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'expired', 'archived'))::int AS active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'expired', 'archived'))::int AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('completed'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS completion_rate,
      COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '${TRAINING_TIMEOUTS.CERTIFICATION_WARNING_DAYS} days' AND status NOT IN ('completed', 'expired', 'archived'))::int AS expiring_soon,
      COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status = 'completed'), 0)::int AS avg_completion_days
    FROM "${schema}".training_programs WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    overdue: row.overdue || 0,
    completionRate: Number(row.completion_rate) || 0,
    expiringSoon: row.expiring_soon || 0,
    avgCompletionDays: row.avg_completion_days || 0,
  };
}

export async function getCategoryBreakdown(tenantId: string): Promise<Array<{
  category: string; count: number; completedCount: number; overdueCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(category, 'general') AS category,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'expired', 'archived'))::int AS overdue_count
    FROM "${schema}".training_programs WHERE deleted_at IS NULL
    GROUP BY category ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    category: r.category,
    count: r.count,
    completedCount: r.completed_count,
    overdueCount: r.overdue_count,
  }));
}

export async function getOverduePrograms(tenantId: string): Promise<Array<{
  id: string; title: string; category: string; status: string; daysOverdue: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, COALESCE(category, 'general') AS category, status,
      EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue
    FROM "${schema}".training_programs
    WHERE deleted_at IS NULL AND due_date < NOW()
      AND status NOT IN ('completed', 'expired', 'archived')
    ORDER BY due_date ASC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    status: r.status,
    daysOverdue: r.days_overdue || 0,
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
        WHEN created_at > NOW() - INTERVAL '180 days' THEN '91-180d'
        ELSE '180d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".training_programs
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'expired', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  category?: string;
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
  if (params.category) { conditions.push(`category = $${idx}`); values.push(params.category); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".training_programs WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".training_programs WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.category) { conditions.push(`category = $${idx}`); values.push(filters.category); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".training_programs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.id, e.title, e.status, e.category, e.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".training_programs e
    JOIN "${schema}".entity_links el ON el.source_entity_id = e.id AND el.source_module = 'training'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
