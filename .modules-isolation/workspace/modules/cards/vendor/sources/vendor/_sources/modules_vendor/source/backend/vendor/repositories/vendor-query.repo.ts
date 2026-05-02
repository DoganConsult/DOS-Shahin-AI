import { safeQuery, tenantSchema } from '../ports/database.port';
import { VENDOR_BUSINESS_THRESHOLDS, VENDOR_TIMEOUTS } from '../data/vendor-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int as count
    FROM "${schema}".vendor_vendors
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
  highRisk: number;
  suspended: number;
  overdueReassessment: number;
  contractsExpiringIn90Days: number;
  contractsExpired: number;
  onboardingRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE risk_rating IN ('critical', 'high') AND status NOT IN ('terminated', 'archived'))::int AS high_risk,
      COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
      COUNT(*) FILTER (WHERE status = 'active' AND risk_rating IN ('critical', 'high') AND updated_at < NOW() - INTERVAL '365 days')::int AS overdue_reassessment,
      COUNT(*) FILTER (WHERE contract_end_date BETWEEN NOW() AND NOW() + INTERVAL '${VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS} days' AND status NOT IN ('terminated', 'archived'))::int AS contracts_expiring_in_90_days,
      COUNT(*) FILTER (WHERE contract_end_date < NOW() AND status NOT IN ('terminated', 'archived'))::int AS contracts_expired,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('terminated', 'archived')) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'active')::numeric / COUNT(*) FILTER (WHERE status NOT IN ('terminated', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS onboarding_rate
    FROM "${schema}".vendor_vendors WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    highRisk: row.high_risk || 0,
    suspended: row.suspended || 0,
    overdueReassessment: row.overdue_reassessment || 0,
    contractsExpiringIn90Days: row.contracts_expiring_in_90_days || 0,
    contractsExpired: row.contracts_expired || 0,
    onboardingRate: Number(row.onboarding_rate) || 0,
  };
}

export async function getRiskRatingBreakdown(tenantId: string): Promise<Array<{
  riskRating: string; count: number; activeCount: number; suspendedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(risk_rating, 'unrated') AS risk_rating,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended_count
    FROM "${schema}".vendor_vendors WHERE deleted_at IS NULL
    GROUP BY risk_rating
    ORDER BY CASE COALESCE(risk_rating, 'unrated')
      WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3
      WHEN 'low' THEN 4 ELSE 5 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    riskRating: r.risk_rating,
    count: r.count,
    activeCount: r.active_count,
    suspendedCount: r.suspended_count,
  }));
}

export async function getCategoryBreakdown(tenantId: string): Promise<Array<{
  category: string; count: number; activeCount: number; highRiskCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(category, 'uncategorized') AS category,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE risk_rating IN ('critical', 'high'))::int AS high_risk_count
    FROM "${schema}".vendor_vendors WHERE deleted_at IS NULL
    GROUP BY category ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    category: r.category,
    count: r.count,
    activeCount: r.active_count,
    highRiskCount: r.high_risk_count,
  }));
}

export async function getHighRiskVendors(tenantId: string): Promise<Array<{
  id: string; name: string; riskRating: string; status: string; category: string;
  contractEndDate: string | null; daysSinceLastReview: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, name, risk_rating, status, COALESCE(category, 'uncategorized') AS category,
      contract_end_date,
      EXTRACT(DAY FROM NOW() - updated_at)::int AS days_since_last_review
    FROM "${schema}".vendor_vendors
    WHERE deleted_at IS NULL
      AND risk_rating IN ('critical', 'high')
      AND status NOT IN ('terminated', 'archived')
    ORDER BY CASE risk_rating WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
      updated_at ASC
    LIMIT $1
  `, [VENDOR_BUSINESS_THRESHOLDS.WARNING_PERCENTAGE]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    riskRating: r.risk_rating,
    status: r.status,
    category: r.category,
    contractEndDate: r.contract_end_date || null,
    daysSinceLastReview: r.days_since_last_review || 0,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '0-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '180 days' THEN '91-180d'
        WHEN created_at > NOW() - INTERVAL '365 days' THEN '181-365d'
        ELSE '1y+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".vendor_vendors
    WHERE deleted_at IS NULL AND status NOT IN ('terminated', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  riskRating?: string;
  category?: string;
  tier?: string;
  contractStatus?: 'active' | 'expiring' | 'expired';
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
  if (params.query) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.riskRating) { conditions.push(`risk_rating = $${idx}`); values.push(params.riskRating); idx++; }
  if (params.category) { conditions.push(`category = $${idx}`); values.push(params.category); idx++; }
  if (params.tier) { conditions.push(`tier = $${idx}`); values.push(params.tier); idx++; }
  if (params.contractStatus === 'active') conditions.push(`(contract_end_date IS NULL OR contract_end_date > NOW())`);
  if (params.contractStatus === 'expiring') conditions.push(`contract_end_date BETWEEN NOW() AND NOW() + INTERVAL '${VENDOR_TIMEOUTS.CONTRACT_EXPIRY_REMINDER_DAYS} days'`);
  if (params.contractStatus === 'expired') conditions.push(`contract_end_date < NOW()`);
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".vendor_vendors WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".vendor_vendors WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.riskRating) { conditions.push(`risk_rating = $${idx}`); values.push(filters.riskRating); idx++; }
  if (filters?.category) { conditions.push(`category = $${idx}`); values.push(filters.category); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".vendor_vendors WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT v.id, v.name, v.status, v.risk_rating, v.category, v.tier,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".vendor_vendors v
    JOIN "${schema}".entity_links el ON el.source_entity_id = v.id AND el.source_module = 'vendor'
    WHERE v.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY v.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
