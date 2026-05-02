import { safeQuery, tenantSchema } from '../ports/database.port';
import { REMEDIATION_BUSINESS_THRESHOLDS as _REMEDIATION_BUSINESS_THRESHOLDS } from '../data/remediation-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".remediation_plans
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
  verificationRate: number;
  avgResolutionDays: number;
  failedCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'archived'))::int AS active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('verified', 'closed', 'archived'))::int AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('verified', 'closed', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS completion_rate,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('pending_verification', 'verified', 'closed')) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('verified', 'closed'))::numeric /
          COUNT(*) FILTER (WHERE status IN ('pending_verification', 'verified', 'closed'))::numeric * 100, 2)
        ELSE 0
      END AS verification_rate,
      COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status IN ('verified', 'closed')), 0)::int AS avg_resolution,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
    FROM "${schema}".remediation_plans WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    overdue: row.overdue || 0,
    completionRate: Number(row.completion_rate) || 0,
    verificationRate: Number(row.verification_rate) || 0,
    avgResolutionDays: row.avg_resolution || 0,
    failedCount: row.failed_count || 0,
  };
}

export async function getSourceBreakdown(tenantId: string): Promise<Array<{
  sourceType: string; count: number; overdueCount: number; verifiedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(source_type, 'self_identified') AS source_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('verified', 'closed', 'archived'))::int AS overdue_count,
      COUNT(*) FILTER (WHERE status = 'verified')::int AS verified_count
    FROM "${schema}".remediation_plans WHERE deleted_at IS NULL
    GROUP BY source_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    sourceType: r.source_type,
    count: r.count,
    overdueCount: r.overdue_count,
    verifiedCount: r.verified_count,
  }));
}

export async function getTypeBreakdown(tenantId: string): Promise<Array<{
  remediationType: string; count: number; failedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(remediation_type, 'technical') AS remediation_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
    FROM "${schema}".remediation_plans WHERE deleted_at IS NULL
    GROUP BY remediation_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    remediationType: r.remediation_type,
    count: r.count,
    failedCount: r.failed_count,
  }));
}

export async function getPendingVerification(tenantId: string): Promise<Array<{
  id: string; title: string; priority: string; assignedTo: string; daysInStatus: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, priority, assigned_to,
      EXTRACT(DAY FROM NOW() - updated_at)::int AS days_in_status
    FROM "${schema}".remediation_plans
    WHERE deleted_at IS NULL AND status = 'pending_verification'
    ORDER BY priority ASC, updated_at ASC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    assignedTo: r.assigned_to || 'unassigned',
    daysInStatus: r.days_in_status || 0,
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
    FROM "${schema}".remediation_plans
    WHERE deleted_at IS NULL AND status NOT IN ('verified', 'closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  priority?: string;
  sourceType?: string;
  remediationType?: string;
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
  if (params.remediationType) { conditions.push(`remediation_type = $${idx}`); values.push(params.remediationType); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".remediation_plans WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".remediation_plans WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.sourceType) { conditions.push(`source_type = $${idx}`); values.push(filters.sourceType); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".remediation_plans WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT r.id, r.title, r.status, r.priority, r.source_type, r.assigned_to, r.due_date,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".remediation_plans r
    JOIN "${schema}".entity_links el ON el.source_entity_id = r.id AND el.source_module = 'remediation'
    WHERE r.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY r.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
