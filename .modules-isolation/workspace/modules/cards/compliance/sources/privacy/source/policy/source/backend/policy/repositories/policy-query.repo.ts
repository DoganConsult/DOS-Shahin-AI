import { safeQuery, tenantSchema } from '../ports/database.port';
import { POLICY_BUSINESS_THRESHOLDS, POLICY_TIMEOUTS } from '../data/policy-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalPolicies: number;
  effectivePolicies: number;
  inReview: number;
  overdueReview: number;
  avgReviewCycleDays: number;
  complianceRate: number;
  deprecatedCount: number;
  underRevisionCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_policies,
      COUNT(*) FILTER (WHERE status IN ('approved', 'published', 'effective'))::int AS effective_policies,
      COUNT(*) FILTER (WHERE status IN ('in_review', 'under_revision'))::int AS in_review,
      COUNT(*) FILTER (
        WHERE review_date IS NOT NULL
          AND review_date < NOW()
          AND status NOT IN ('deprecated', 'archived')
      )::int AS overdue_review,
      COALESCE(
        AVG(EXTRACT(DAY FROM (review_date - effective_date)))
        FILTER (WHERE review_date IS NOT NULL AND effective_date IS NOT NULL),
        ${POLICY_TIMEOUTS.DEFAULT_REVIEW_CYCLE_DAYS}
      )::int AS avg_review_cycle_days,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('deprecated', 'archived')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status IN ('approved', 'published', 'effective'))::numeric /
          COUNT(*) FILTER (WHERE status NOT IN ('deprecated', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS compliance_rate,
      COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated_count,
      COUNT(*) FILTER (WHERE status = 'under_revision')::int AS under_revision_count
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    totalPolicies: row.total_policies || 0,
    effectivePolicies: row.effective_policies || 0,
    inReview: row.in_review || 0,
    overdueReview: row.overdue_review || 0,
    avgReviewCycleDays: row.avg_review_cycle_days || POLICY_TIMEOUTS.DEFAULT_REVIEW_CYCLE_DAYS,
    complianceRate: Number(row.compliance_rate) || 0,
    deprecatedCount: row.deprecated_count || 0,
    underRevisionCount: row.under_revision_count || 0,
  };
}

export async function getPolicyTypeBreakdown(tenantId: string): Promise<Array<{
  policyType: string;
  count: number;
  effectiveCount: number;
  overdueReviewCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(policy_type, 'policy') AS policy_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status IN ('approved', 'published', 'effective'))::int AS effective_count,
      COUNT(*) FILTER (
        WHERE review_date IS NOT NULL AND review_date < NOW() AND status NOT IN ('deprecated', 'archived')
      )::int AS overdue_review_count
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
    GROUP BY policy_type
    ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    policyType: r.policy_type,
    count: r.count,
    effectiveCount: r.effective_count,
    overdueReviewCount: r.overdue_review_count,
  }));
}

export async function getCategoryBreakdown(tenantId: string): Promise<Array<{
  category: string;
  count: number;
  effectiveCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(category, 'uncategorized') AS category,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status IN ('approved', 'published', 'effective'))::int AS effective_count
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
    GROUP BY category
    ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    category: r.category,
    count: r.count,
    effectiveCount: r.effective_count,
  }));
}

export async function getReviewCycleCompliance(tenantId: string): Promise<{
  totalWithReviewDate: number;
  onSchedule: number;
  dueSoon: number;
  overdue: number;
  noReviewDate: number;
  complianceRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*) FILTER (WHERE review_date IS NOT NULL)::int AS total_with_review_date,
      COUNT(*) FILTER (
        WHERE review_date IS NOT NULL
          AND review_date >= NOW()
          AND review_date > NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days'
          AND status NOT IN ('deprecated', 'archived')
      )::int AS on_schedule,
      COUNT(*) FILTER (
        WHERE review_date IS NOT NULL
          AND review_date >= NOW()
          AND review_date <= NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days'
          AND status NOT IN ('deprecated', 'archived')
      )::int AS due_soon,
      COUNT(*) FILTER (
        WHERE review_date IS NOT NULL
          AND review_date < NOW()
          AND status NOT IN ('deprecated', 'archived')
      )::int AS overdue,
      COUNT(*) FILTER (WHERE review_date IS NULL AND status NOT IN ('deprecated', 'archived'))::int AS no_review_date
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL AND status NOT IN ('deprecated', 'archived')
  `);
  const row = result.rows[0] || {};
  const onSchedule = row.on_schedule || 0;
  const withReviewDate = row.total_with_review_date || 0;
  const complianceRate = withReviewDate > 0 ? Math.round((onSchedule / withReviewDate) * 100 * 100) / 100 : 0;
  return {
    totalWithReviewDate: withReviewDate,
    onSchedule,
    dueSoon: row.due_soon || 0,
    overdue: row.overdue || 0,
    noReviewDate: row.no_review_date || 0,
    complianceRate,
  };
}

export async function getOverduePolicies(tenantId: string, limit = 50): Promise<Array<{
  id: string;
  title: string;
  status: string;
  policyType: string;
  category: string;
  reviewDate: string;
  daysOverdue: number;
  ownerId: string;
  version: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      id,
      title,
      status,
      COALESCE(policy_type, 'policy') AS policy_type,
      COALESCE(category, 'uncategorized') AS category,
      review_date,
      EXTRACT(DAY FROM NOW() - review_date)::int AS days_overdue,
      owner_id,
      version
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
      AND review_date IS NOT NULL
      AND review_date < NOW()
      AND status NOT IN ('deprecated', 'archived')
    ORDER BY review_date ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    policyType: r.policy_type,
    category: r.category,
    reviewDate: r.review_date,
    daysOverdue: r.days_overdue || 0,
    ownerId: r.owner_id,
    version: r.version || 1,
  }));
}

export async function getVersionCurrencyReport(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  version: number;
  status: string;
  lastUpdated: string;
  daysSinceUpdate: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      id, title, version, status, updated_at AS last_updated,
      EXTRACT(DAY FROM NOW() - updated_at)::int AS days_since_update
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL
      AND status IN ('approved', 'published', 'effective')
      AND updated_at < NOW() - INTERVAL '${POLICY_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'
    ORDER BY updated_at ASC
    LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    version: r.version || 1,
    status: r.status,
    lastUpdated: r.last_updated,
    daysSinceUpdate: r.days_since_update || 0,
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
        ELSE '365d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".policy_policies
    WHERE deleted_at IS NULL AND status NOT IN ('deprecated', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  policyType?: string;
  category?: string;
  framework?: string;
  reviewStatus?: 'on_schedule' | 'due_soon' | 'overdue' | 'no_review_date';
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

  if (params.query) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) {
    conditions.push(`status = $${idx}`);
    values.push(params.status);
    idx++;
  }
  if (params.policyType) {
    conditions.push(`policy_type = $${idx}`);
    values.push(params.policyType);
    idx++;
  }
  if (params.category) {
    conditions.push(`category = $${idx}`);
    values.push(params.category);
    idx++;
  }
  if (params.framework) {
    conditions.push(`frameworks @> ARRAY[$${idx}]::text[]`);
    values.push(params.framework);
    idx++;
  }
  if (params.reviewStatus === 'overdue') {
    conditions.push(`review_date IS NOT NULL AND review_date < NOW() AND status NOT IN ('deprecated', 'archived')`);
  } else if (params.reviewStatus === 'due_soon') {
    conditions.push(`review_date IS NOT NULL AND review_date >= NOW() AND review_date <= NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days' AND status NOT IN ('deprecated', 'archived')`);
  } else if (params.reviewStatus === 'on_schedule') {
    conditions.push(`review_date IS NOT NULL AND review_date > NOW() + INTERVAL '${POLICY_TIMEOUTS.REMINDER_BEFORE_DAYS} days' AND status NOT IN ('deprecated', 'archived')`);
  } else if (params.reviewStatus === 'no_review_date') {
    conditions.push(`review_date IS NULL AND status NOT IN ('deprecated', 'archived')`);
  }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".policy_policies WHERE ${where}`, values);
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".policy_policies WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, pageSize, offset],
  );
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.policyType) { conditions.push(`policy_type = $${idx}`); values.push(filters.policyType); idx++; }
  if (filters?.category) { conditions.push(`category = $${idx}`); values.push(filters.category); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".policy_policies WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`,
    values,
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT p.id, p.title, p.status, p.policy_type, p.category, p.version, p.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".policy_policies p
    JOIN "${schema}".entity_links el ON el.source_entity_id = p.id AND el.source_module = 'policy'
    WHERE p.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY p.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
