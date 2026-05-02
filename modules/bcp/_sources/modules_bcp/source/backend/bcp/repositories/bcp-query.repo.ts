import { safeQuery, tenantSchema } from '../ports/database.port';
import { BCP_BUSINESS_THRESHOLDS } from '../data/bcp-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".bcp_plans
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
  testedOnTime: number;
  overdueForTesting: number;
  avgRtoHours: number;
  avgRpoHours: number;
  testPassRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'active' AND last_tested > NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')::int AS tested_on_time,
      COUNT(*) FILTER (WHERE status = 'active' AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days'))::int AS overdue_testing,
      COALESCE(AVG(rto_hours) FILTER (WHERE rto_hours IS NOT NULL), 0)::int AS avg_rto,
      COALESCE(AVG(rpo_hours) FILTER (WHERE rpo_hours IS NOT NULL), 0)::int AS avg_rpo,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('active', 'failed_test')) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'active' AND last_tested IS NOT NULL)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('active', 'failed_test')), 0)::numeric * 100, 2)
        ELSE 0
      END AS test_pass_rate
    FROM "${schema}".bcp_plans WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    testedOnTime: row.tested_on_time || 0,
    overdueForTesting: row.overdue_testing || 0,
    avgRtoHours: row.avg_rto || 0,
    avgRpoHours: row.avg_rpo || 0,
    testPassRate: Number(row.test_pass_rate) || 0,
  };
}

export async function getPlanTypeBreakdown(tenantId: string): Promise<Array<{
  planType: string; count: number; activeCount: number; untestedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(plan_type, 'bcp') AS plan_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'active' AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days'))::int AS untested_count
    FROM "${schema}".bcp_plans WHERE deleted_at IS NULL
    GROUP BY plan_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    planType: r.plan_type,
    count: r.count,
    activeCount: r.active_count,
    untestedCount: r.untested_count,
  }));
}

export async function getTestingOverdue(tenantId: string): Promise<Array<{
  id: string; title: string; planType: string; lastTested: string | null; daysSinceTest: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, plan_type, last_tested,
      CASE WHEN last_tested IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - last_tested)::int
        ELSE 9999
      END AS days_since_test
    FROM "${schema}".bcp_plans
    WHERE deleted_at IS NULL AND status = 'active'
      AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')
    ORDER BY last_tested ASC NULLS FIRST LIMIT 50
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    planType: r.plan_type,

    lastTested: r.last_tested?.toISOString?.() || r.last_tested || null,
    daysSinceTest: r.days_since_test || 9999,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '0-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '365 days' THEN '91-365d'
        WHEN created_at > NOW() - INTERVAL '730 days' THEN '1-2y'
        ELSE '2y+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".bcp_plans
    WHERE deleted_at IS NULL AND status NOT IN ('retired', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  planType?: string;
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
  if (params.planType) { conditions.push(`plan_type = $${idx}`); values.push(params.planType); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".bcp_plans WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".bcp_plans WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.planType) { conditions.push(`plan_type = $${idx}`); values.push(filters.planType); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".bcp_plans WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT b.id, b.title, b.status, b.plan_type, b.rto_hours, b.rpo_hours, b.last_tested,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".bcp_plans b
    JOIN "${schema}".entity_links el ON el.source_entity_id = b.id AND el.source_module = 'bcp'
    WHERE b.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY b.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
