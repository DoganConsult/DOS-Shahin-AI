import { safeQuery, tenantSchema } from '../ports/database.port';
import { RISK_SLA_DEFAULTS as _RISK_SLA_DEFAULTS, RISK_BUSINESS_THRESHOLDS as _RISK_BUSINESS_THRESHOLDS } from '../data/risk-constants';

const SEVERITY_CASE = `
  CASE
    WHEN (likelihood * impact) >= 20 THEN 'critical'
    WHEN (likelihood * impact) >= 12 THEN 'high'
    WHEN (likelihood * impact) >= 6  THEN 'medium'
    ELSE 'low'
  END
`;

const SEVERITY_ORDER = `
  CASE
    WHEN (likelihood * impact) >= 20 THEN 1
    WHEN (likelihood * impact) >= 12 THEN 2
    WHEN (likelihood * impact) >= 6  THEN 3
    ELSE 4
  END
`;

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalRisks: number;
  activeRisks: number;
  criticalRisks: number;
  untreatedRisks: number;
  treatmentCoverage: number;
  avgResidualScore: number;
  overdueReassessment: number;
  riskAcceptanceRate: number;
  closureRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_risks,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active_risks,
      COUNT(*) FILTER (WHERE (likelihood * impact) >= 20 AND status NOT IN ('closed', 'archived'))::int AS critical_risks,
      COUNT(*) FILTER (WHERE treatment_status IS NULL AND status NOT IN ('closed', 'archived', 'accepted'))::int AS untreated_risks,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE treatment_status IS NOT NULL AND status NOT IN ('closed', 'archived'))::numeric /
          COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS treatment_coverage,
      COALESCE(AVG(residual_score) FILTER (WHERE residual_score IS NOT NULL AND status NOT IN ('closed', 'archived')), 0)::numeric(5,2) AS avg_residual_score,
      COUNT(*) FILTER (WHERE last_assessed_at < NOW() - INTERVAL '90 days' AND status NOT IN ('closed', 'archived'))::int AS overdue_reassessment,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('draft', 'identified')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status = 'accepted')::numeric /
          COUNT(*) FILTER (WHERE status NOT IN ('draft', 'identified'))::numeric * 100, 2)
        ELSE 0
      END AS risk_acceptance_rate,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS closure_rate
    FROM "${schema}".risk_risks WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    totalRisks: row.total_risks || 0,
    activeRisks: row.active_risks || 0,
    criticalRisks: row.critical_risks || 0,
    untreatedRisks: row.untreated_risks || 0,
    treatmentCoverage: Number(row.treatment_coverage) || 0,
    avgResidualScore: Number(row.avg_residual_score) || 0,
    overdueReassessment: row.overdue_reassessment || 0,
    riskAcceptanceRate: Number(row.risk_acceptance_rate) || 0,
    closureRate: Number(row.closure_rate) || 0,
  };
}

export async function getRiskSeverityBreakdown(tenantId: string): Promise<Array<{
  severity: string;
  count: number;
  openCount: number;
  avgResidualScore: number;
  treatmentCoverage: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      ${SEVERITY_CASE} AS severity,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS open_count,
      COALESCE(AVG(residual_score) FILTER (WHERE residual_score IS NOT NULL), 0)::numeric(5,2) AS avg_residual_score,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE treatment_status IS NOT NULL AND status NOT IN ('closed', 'archived'))::numeric /
          COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS treatment_coverage
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL
    GROUP BY severity
    ORDER BY MIN(${SEVERITY_ORDER})
  `);

  return result.rows as unknown as Array<{
    severity: string;
    count: number;
    openCount: number;
    avgResidualScore: number;
    treatmentCoverage: number;
  }>;
}

export async function getCategoryBreakdown(tenantId: string): Promise<Array<{
  category: string;
  count: number;
  openCount: number;
  criticalCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(category, 'uncategorized') AS category,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS open_count,
      COUNT(*) FILTER (WHERE (likelihood * impact) >= 20 AND status NOT IN ('closed', 'archived'))::int AS critical_count
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL
    GROUP BY category
    ORDER BY count DESC
  `);

  return result.rows as unknown as Array<{
    category: string;
    count: number;
    openCount: number;
    criticalCount: number;
  }>;
}

export async function getTreatmentStatusBreakdown(tenantId: string): Promise<Array<{
  treatmentStatus: string;
  treatmentType: string | null;
  count: number;
  avgResidualScore: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(treatment_status, 'untreated') AS treatment_status,
      treatment_type,
      COUNT(*)::int AS count,
      COALESCE(AVG(residual_score) FILTER (WHERE residual_score IS NOT NULL), 0)::numeric(5,2) AS avg_residual_score
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY treatment_status, treatment_type
    ORDER BY count DESC
  `);

  return result.rows as unknown as Array<{
    treatmentStatus: string;
    treatmentType: string | null;
    count: number;
    avgResidualScore: number;
  }>;
}

export async function getCriticalRisks(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  residualScore: number | null;
  status: string;
  treatmentStatus: string | null;
  owner: string;
  daysOpen: number;
  overdueReassessment: boolean;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      id, title, category, likelihood, impact,
      COALESCE(risk_score, likelihood * impact)::int AS risk_score,
      residual_score,
      status, treatment_status, owner,
      EXTRACT(DAY FROM NOW() - created_at)::int AS days_open,
      (last_assessed_at IS NOT NULL AND last_assessed_at < NOW() - INTERVAL '90 days') AS overdue_reassessment
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL
      AND (likelihood * impact) >= 12
      AND status NOT IN ('closed', 'archived')
    ORDER BY (likelihood * impact) DESC, created_at ASC
    LIMIT 50
  `);

  return result.rows as unknown as Array<{
    id: string;
    title: string;
    category: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    residualScore: number | null;
    status: string;
    treatmentStatus: string | null;
    owner: string;
    daysOpen: number;
    overdueReassessment: boolean;
  }>;
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days'  THEN '0-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '180 days' THEN '91-180d'
        ELSE '180d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY bucket
    ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  severity?: string;
  riskCategory?: string;
  treatmentStatus?: string;
  ownerId?: string;
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
  if (params.severity) {
    const sevMap: Record<string, string> = {
      critical: '(likelihood * impact) >= 20',
      high: '(likelihood * impact) BETWEEN 12 AND 19',
      medium: '(likelihood * impact) BETWEEN 6 AND 11',
      low: '(likelihood * impact) BETWEEN 1 AND 5',
    };
    if (sevMap[params.severity]) conditions.push(sevMap[params.severity]);
  }
  if (params.riskCategory) {
    conditions.push(`category = $${idx}`);
    values.push(params.riskCategory);
    idx++;
  }
  if (params.treatmentStatus) {
    if (params.treatmentStatus === 'untreated') {
      conditions.push('treatment_status IS NULL');
    } else {
      conditions.push(`treatment_status = $${idx}`);
      values.push(params.treatmentStatus);
      idx++;
    }
  }
  if (params.ownerId) {
    conditions.push(`owner = $${idx}`);
    values.push(params.ownerId);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".risk_risks WHERE ${where}`,
    values,
  );
  const dataResult = await safeQuery(
    `SELECT *, COALESCE(risk_score, likelihood * impact) AS computed_score,
      ${SEVERITY_CASE} AS computed_severity
     FROM "${schema}".risk_risks WHERE ${where}
     ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
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
  if (filters?.category) { conditions.push(`category = $${idx}`); values.push(filters.category); idx++; }
  if (filters?.treatmentStatus) { conditions.push(`treatment_status = $${idx}`); values.push(filters.treatmentStatus); idx++; }
  const result = await safeQuery(
    `SELECT *, COALESCE(risk_score, likelihood * impact) AS computed_score, ${SEVERITY_CASE} AS computed_severity
     FROM "${schema}".risk_risks WHERE ${conditions.join(' AND ')}
     ORDER BY (likelihood * impact) DESC, created_at DESC
     LIMIT $${idx}`,
    [...values, 10000],
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      r.id, r.title, r.status, r.category, r.likelihood, r.impact,
      COALESCE(r.risk_score, r.likelihood * r.impact) AS risk_score,
      ${SEVERITY_CASE.replace(/likelihood/g, 'r.likelihood').replace(/impact/g, 'r.impact')} AS severity,
      r.treatment_status, r.owner, r.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".risk_risks r
    JOIN "${schema}".entity_links el ON el.source_entity_id = r.id AND el.source_module = 'risk'
    WHERE r.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY (r.likelihood * r.impact) DESC, r.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getRiskAppetiteExceedances(tenantId: string, appetiteScoreThreshold: number): Promise<Array<{
  id: string; title: string; category: string; riskScore: number; appetiteThreshold: number; exceedanceAmount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, category,
      COALESCE(risk_score, likelihood * impact) AS risk_score
    FROM "${schema}".risk_risks
    WHERE deleted_at IS NULL
      AND COALESCE(risk_score, likelihood * impact) > $1
      AND status NOT IN ('closed', 'archived', 'accepted')
    ORDER BY COALESCE(risk_score, likelihood * impact) DESC
  `, [appetiteScoreThreshold]);

  return result.rows as unknown as Array<{
    id: string;
    title: string;
    category: string;
    riskScore: number;
    appetiteThreshold: number;
    exceedanceAmount: number;
  }>;
}
