import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int as count
    FROM "${schema}".ai_agents
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
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int as active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'completed'))::int as overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'completed', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END as completion_rate
    FROM "${schema}".ai_agents
    WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || { total: 0, active: 0, overdue: 0, completion_rate: 0 };
  return { total: row.total, active: row.active, overdue: row.overdue, completionRate: Number(row.completion_rate) };
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '0-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        ELSE '90d+'
      END as bucket,
      COUNT(*)::int as count
    FROM "${schema}".ai_agents
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
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
  if (params.query) { conditions.push(`(title ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int as total FROM "${schema}".ai_agents WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".ai_agents WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['deleted_at IS NULL'];
  if (filters?.status) conditions.push(`status = '${filters.status}'`);
  const result = await safeQuery(`SELECT * FROM "${schema}".ai_agents WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.*, el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".ai_agents e
    LEFT JOIN "${schema}".entity_links el ON el.source_entity_id = e.id AND el.source_module = 'ai'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
