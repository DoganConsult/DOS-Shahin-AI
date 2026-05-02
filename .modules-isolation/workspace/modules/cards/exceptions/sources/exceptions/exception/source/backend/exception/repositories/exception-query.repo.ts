import { safeQuery, tenantSchema } from '../ports/database.port';
import { EXCEPTION_BUSINESS_THRESHOLDS } from '../data/exception-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".exceptions
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
  pending: number;
  expired: number;
  overdue: number;
  completionRate: number;
  avgDurationDays: number;
  renewalRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
      COUNT(*) FILTER (WHERE expires_at < NOW() AND status NOT IN ('expired', 'revoked', 'closed', 'archived'))::int AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'archived', 'revoked'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS completion_rate,
      COALESCE(AVG(EXTRACT(DAY FROM COALESCE(expires_at::timestamp, NOW()) - created_at)) FILTER (WHERE expires_at IS NOT NULL), 0)::int AS avg_duration
    FROM "${schema}".exceptions WHERE deleted_at IS NULL
  `);
  const renewalResult = await safeQuery(`
    SELECT CASE WHEN COUNT(DISTINCT e.exception_id) > 0
      THEN ROUND(COUNT(DISTINCT r.exception_id)::numeric / COUNT(DISTINCT e.exception_id)::numeric * 100, 2)
      ELSE 0
    END AS renewal_rate
    FROM "${schema}".exceptions e
    LEFT JOIN "${schema}".exception_renewals r ON r.exception_id = e.exception_id
    WHERE e.deleted_at IS NULL
  `).catch(() => ({ rows: [{ renewal_rate: 0 }] }));
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    pending: row.pending || 0,
    expired: row.expired || 0,
    overdue: row.overdue || 0,
    completionRate: Number(row.completion_rate) || 0,
    avgDurationDays: row.avg_duration || 0,
    renewalRate: Number(renewalResult.rows[0]?.renewal_rate) || 0,
  };
}

export async function getTypeBreakdown(tenantId: string): Promise<Array<{
  exceptionType: string; count: number; activeCount: number; expiredCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(exception_type, 'unspecified') AS exception_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_count
    FROM "${schema}".exceptions WHERE deleted_at IS NULL
    GROUP BY exception_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    exceptionType: r.exception_type,
    count: r.count,
    activeCount: r.active_count,
    expiredCount: r.expired_count,
  }));
}

export async function getRiskLevelBreakdown(tenantId: string): Promise<Array<{
  riskLevel: string; count: number; activeCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(risk_acceptance, 'unspecified') AS risk_level,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count
    FROM "${schema}".exceptions WHERE deleted_at IS NULL
    GROUP BY risk_level
    ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    riskLevel: r.risk_level,
    count: r.count,
    activeCount: r.active_count,
  }));
}

export async function getExpiringExceptions(tenantId: string): Promise<Array<{
  id: string; controlId: string; reason: string; status: string;
  expiresAt: string; daysUntilExpiry: number; riskAcceptance: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, control_id, reason, status, expires_at, risk_acceptance,
      EXTRACT(DAY FROM expires_at - NOW())::int AS days_until_expiry
    FROM "${schema}".exceptions
    WHERE deleted_at IS NULL AND status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '${EXCEPTION_BUSINESS_THRESHOLDS.EXPIRY_WARNING_DAYS} days'
    ORDER BY expires_at ASC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    controlId: r.control_id,
    reason: r.reason,
    status: r.status,

    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,
    daysUntilExpiry: r.days_until_expiry || 0,
    riskAcceptance: r.risk_acceptance || 'unspecified',
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
    FROM "${schema}".exceptions
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  exceptionType?: string;
  riskLevel?: string;
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
  if (params.query) { conditions.push(`(reason ILIKE $${idx} OR control_id ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.exceptionType) { conditions.push(`exception_type = $${idx}`); values.push(params.exceptionType); idx++; }
  if (params.riskLevel) { conditions.push(`risk_acceptance = $${idx}`); values.push(params.riskLevel); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exceptions WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".exceptions WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.exceptionType) { conditions.push(`exception_type = $${idx}`); values.push(filters.exceptionType); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".exceptions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.id, e.control_id, e.reason, e.status, e.risk_acceptance, e.expires_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".exceptions e
    JOIN "${schema}".entity_links el ON el.source_entity_id = e.id AND el.source_module = 'exception'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
