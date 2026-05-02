import { safeQuery, tenantSchema } from '../ports/database.port';
import { GOVERNANCE_BUSINESS_THRESHOLDS, GOVERNANCE_TIMEOUTS as _GOVERNANCE_TIMEOUTS } from '../data/governance-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".governance_frameworks
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalFrameworks: number;
  activeFrameworks: number;
  controlCoverage: number;
  avgMaturityScore: number;
  unimplementedControls: number;
  overdueAssessments: number;
  approvedFrameworks: number;
  deprecatedFrameworks: number;
}> {
  const schema = tenantSchema(tenantId);

  const [frameworkResult, controlResult, maturityResult, assessmentResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated
      FROM "${schema}".governance_frameworks WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total_controls,
        COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
        COUNT(*) FILTER (WHERE implementation_status = 'not_implemented')::int AS not_implemented
      FROM "${schema}".governance_controls WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT COALESCE(ROUND(AVG(maturity_score)::numeric, 2), 0) AS avg_score
      FROM "${schema}".governance_maturity_assessments
      WHERE deleted_at IS NULL AND assessment_date = (
        SELECT MAX(a2.assessment_date) FROM "${schema}".governance_maturity_assessments a2
        WHERE a2.framework_id = governance_maturity_assessments.framework_id AND a2.deleted_at IS NULL
      )
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT COUNT(*)::int AS overdue
      FROM "${schema}".governance_maturity_assessments
      WHERE deleted_at IS NULL
        AND next_review_date < NOW()
        AND status NOT IN ('completed', 'cancelled')
    `).catch(() => ({ rows: [{}] })),
  ]);

  const fr = frameworkResult.rows[0] || {};
  const cr = controlResult.rows[0] || {};
  const mr = maturityResult.rows[0] || {};
  const ar = assessmentResult.rows[0] || {};

  const totalControls = cr.total_controls || 0;
  const implemented = cr.implemented || 0;
  const controlCoverage = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;

  return {
    totalFrameworks: fr.total || 0,
    activeFrameworks: fr.active || 0,
    approvedFrameworks: fr.approved || 0,
    deprecatedFrameworks: fr.deprecated || 0,
    controlCoverage,
    avgMaturityScore: Number(mr.avg_score) || 0,
    unimplementedControls: cr.not_implemented || 0,
    overdueAssessments: ar.overdue || 0,
  };
}

export async function getFrameworkTypeBreakdown(tenantId: string): Promise<Array<{
  frameworkType: string;
  count: number;
  activeCount: number;
  avgMaturityScore: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(f.framework_type, 'other') AS framework_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE f.status = 'active')::int AS active_count,
      COALESCE(
        ROUND(AVG(
          (SELECT ma.maturity_score FROM "${schema}".governance_maturity_assessments ma
           WHERE ma.framework_id = f.id AND ma.deleted_at IS NULL
           ORDER BY ma.assessment_date DESC LIMIT 1)
        )::numeric, 2), 0
      ) AS avg_maturity_score
    FROM "${schema}".governance_frameworks f
    WHERE f.deleted_at IS NULL
    GROUP BY f.framework_type
    ORDER BY count DESC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    frameworkType: r.framework_type,
    count: r.count,
    activeCount: r.active_count,
    avgMaturityScore: Number(r.avg_maturity_score) || 0,
  }));
}

export async function getControlImplementationStatus(tenantId: string): Promise<Array<{
  frameworkType: string;
  frameworkId: string;
  frameworkTitle: string;
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  notImplemented: number;
  notApplicable: number;
  coveragePercent: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      f.id AS framework_id,
      f.title AS framework_title,
      COALESCE(f.framework_type, 'other') AS framework_type,
      COUNT(c.id)::int AS total_controls,
      COUNT(c.id) FILTER (WHERE c.implementation_status = 'implemented')::int AS implemented,
      COUNT(c.id) FILTER (WHERE c.implementation_status = 'partially_implemented')::int AS partially_implemented,
      COUNT(c.id) FILTER (WHERE c.implementation_status = 'not_implemented')::int AS not_implemented,
      COUNT(c.id) FILTER (WHERE c.implementation_status = 'not_applicable')::int AS not_applicable,
      CASE WHEN COUNT(c.id) > 0
        THEN ROUND(COUNT(c.id) FILTER (WHERE c.implementation_status = 'implemented')::numeric / COUNT(c.id)::numeric * 100, 2)
        ELSE 0
      END AS coverage_percent
    FROM "${schema}".governance_frameworks f
    LEFT JOIN "${schema}".governance_controls c ON c.framework_id = f.id AND c.deleted_at IS NULL
    WHERE f.deleted_at IS NULL AND f.status NOT IN ('deprecated', 'archived')
    GROUP BY f.id, f.title, f.framework_type
    ORDER BY coverage_percent ASC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    frameworkId: r.framework_id,
    frameworkTitle: r.framework_title,
    frameworkType: r.framework_type,
    totalControls: r.total_controls,
    implemented: r.implemented,
    partiallyImplemented: r.partially_implemented,
    notImplemented: r.not_implemented,
    notApplicable: r.not_applicable,
    coveragePercent: Number(r.coverage_percent) || 0,
  }));
}

export async function getControlGaps(tenantId: string, frameworkId?: string): Promise<Array<{
  controlId: string;
  controlCode: string;
  controlTitle: string;
  frameworkId: string;
  frameworkTitle: string;
  frameworkType: string;
  category: string;
  implementationStatus: string;
  riskLevel: string;
  daysOpen: number;
  assignedTo: string | null;
}>> {
  const schema = tenantSchema(tenantId);
  const conditions = [
    `c.deleted_at IS NULL`,
    `c.implementation_status IN ('not_implemented', 'partially_implemented')`,
    `f.deleted_at IS NULL`,
    `f.status NOT IN ('deprecated', 'archived')`,
  ];
  const values: unknown[] = [];
  if (frameworkId) {
    conditions.push(`c.framework_id = $1`);
    values.push(frameworkId);
  }

  const result = await safeQuery(`
    SELECT
      c.id AS control_id,
      COALESCE(c.control_code, c.id::text) AS control_code,
      c.title AS control_title,
      f.id AS framework_id,
      f.title AS framework_title,
      COALESCE(f.framework_type, 'other') AS framework_type,
      COALESCE(c.category, 'general') AS category,
      c.implementation_status,
      COALESCE(c.risk_level, 'medium') AS risk_level,
      EXTRACT(DAY FROM NOW() - c.created_at)::int AS days_open,
      c.assigned_to
    FROM "${schema}".governance_controls c
    JOIN "${schema}".governance_frameworks f ON f.id = c.framework_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE c.risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      c.created_at ASC
    LIMIT $${values.length + 1}
  `, [...values, GOVERNANCE_BUSINESS_THRESHOLDS.MIN_COMPLETION_FOR_CLOSE]).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    controlId: r.control_id,
    controlCode: r.control_code,
    controlTitle: r.control_title,
    frameworkId: r.framework_id,
    frameworkTitle: r.framework_title,
    frameworkType: r.framework_type,
    category: r.category,
    implementationStatus: r.implementation_status,
    riskLevel: r.risk_level,
    daysOpen: r.days_open || 0,
    assignedTo: r.assigned_to || null,
  }));
}

export async function getMaturityScoreBreakdown(tenantId: string): Promise<Array<{
  frameworkId: string;
  frameworkTitle: string;
  frameworkType: string;
  maturityLevel: string;
  maturityScore: number;
  assessmentDate: string;
  trend: 'improving' | 'regressing' | 'stable';
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      f.id AS framework_id,
      f.title AS framework_title,
      COALESCE(f.framework_type, 'other') AS framework_type,
      latest.maturity_level,
      latest.maturity_score,
      latest.assessment_date,
      COALESCE(latest.maturity_score - prev.maturity_score, 0) AS score_delta
    FROM "${schema}".governance_frameworks f
    JOIN LATERAL (
      SELECT maturity_level, maturity_score, assessment_date
      FROM "${schema}".governance_maturity_assessments
      WHERE framework_id = f.id AND deleted_at IS NULL
      ORDER BY assessment_date DESC LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT maturity_score
      FROM "${schema}".governance_maturity_assessments
      WHERE framework_id = f.id AND deleted_at IS NULL
      ORDER BY assessment_date DESC LIMIT 1 OFFSET 1
    ) prev ON true
    WHERE f.deleted_at IS NULL
    ORDER BY latest.maturity_score ASC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => {
    const delta = Number(r.score_delta) || 0;
    const trend: 'improving' | 'regressing' | 'stable' = delta > 0 ? 'improving' : delta < 0 ? 'regressing' : 'stable';
    return {
      frameworkId: r.framework_id,
      frameworkTitle: r.framework_title,
      frameworkType: r.framework_type,
      maturityLevel: r.maturity_level,
      maturityScore: Number(r.maturity_score) || 0,
      assessmentDate: r.assessment_date,
      trend,
    };
  });
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
    FROM "${schema}".governance_frameworks
    WHERE deleted_at IS NULL AND status NOT IN ('deprecated', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `).catch(() => ({ rows: [] }));
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  frameworkType?: string;
  maturityLevel?: string;
  controlStatus?: string;
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
  const conditions: string[] = ['f.deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.query) {
    conditions.push(`(f.title ILIKE $${idx} OR f.description ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) {
    conditions.push(`f.status = $${idx}`);
    values.push(params.status);
    idx++;
  }
  if (params.frameworkType) {
    conditions.push(`f.framework_type = $${idx}`);
    values.push(params.frameworkType);
    idx++;
  }
  if (params.maturityLevel) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "${schema}".governance_maturity_assessments ma
      WHERE ma.framework_id = f.id AND ma.maturity_level = $${idx} AND ma.deleted_at IS NULL
      ORDER BY ma.assessment_date DESC LIMIT 1
    )`);
    values.push(params.maturityLevel);
    idx++;
  }
  if (params.controlStatus) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "${schema}".governance_controls c
      WHERE c.framework_id = f.id AND c.implementation_status = $${idx} AND c.deleted_at IS NULL
    )`);
    values.push(params.controlStatus);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".governance_frameworks f WHERE ${where}`,
    values,
  );
  const dataResult = await safeQuery(
    `SELECT f.* FROM "${schema}".governance_frameworks f WHERE ${where} ORDER BY f.${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, pageSize, offset],
  );
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['f.deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`f.status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.frameworkType) { conditions.push(`f.framework_type = $${idx}`); values.push(filters.frameworkType); idx++; }
  const result = await safeQuery(
    `SELECT f.*,
       (SELECT COUNT(*)::int FROM "${schema}".governance_controls c WHERE c.framework_id = f.id AND c.deleted_at IS NULL) AS total_controls,
       (SELECT COUNT(*)::int FROM "${schema}".governance_controls c WHERE c.framework_id = f.id AND c.implementation_status = 'implemented' AND c.deleted_at IS NULL) AS implemented_controls
     FROM "${schema}".governance_frameworks f
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.created_at DESC
     LIMIT 5000`,
    values,
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT f.id, f.title, f.status, f.framework_type, f.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".governance_frameworks f
    JOIN "${schema}".entity_links el ON el.source_entity_id = f.id AND el.source_module = 'governance'
    WHERE f.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY f.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getOverdueAssessments(tenantId: string): Promise<Array<{
  frameworkId: string;
  frameworkTitle: string;
  frameworkType: string;
  lastAssessmentDate: string | null;
  nextReviewDate: string | null;
  daysPastDue: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      f.id AS framework_id,
      f.title AS framework_title,
      COALESCE(f.framework_type, 'other') AS framework_type,
      latest.assessment_date AS last_assessment_date,
      latest.next_review_date,
      GREATEST(EXTRACT(DAY FROM NOW() - latest.next_review_date)::int, 0) AS days_past_due
    FROM "${schema}".governance_frameworks f
    JOIN LATERAL (
      SELECT assessment_date, next_review_date
      FROM "${schema}".governance_maturity_assessments
      WHERE framework_id = f.id AND deleted_at IS NULL
      ORDER BY assessment_date DESC LIMIT 1
    ) latest ON true
    WHERE f.deleted_at IS NULL
      AND f.status IN ('active', 'approved')
      AND latest.next_review_date < NOW()
    ORDER BY days_past_due DESC
    LIMIT 50
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    frameworkId: r.framework_id,
    frameworkTitle: r.framework_title,
    frameworkType: r.framework_type,
    lastAssessmentDate: r.last_assessment_date || null,
    nextReviewDate: r.next_review_date || null,
    daysPastDue: r.days_past_due || 0,
  }));
}

export async function getFrameworksNeverAssessed(tenantId: string): Promise<Array<{
  frameworkId: string;
  frameworkTitle: string;
  frameworkType: string;
  daysSinceCreation: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      f.id AS framework_id,
      f.title AS framework_title,
      COALESCE(f.framework_type, 'other') AS framework_type,
      EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_since_creation
    FROM "${schema}".governance_frameworks f
    WHERE f.deleted_at IS NULL
      AND f.status IN ('active', 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM "${schema}".governance_maturity_assessments ma
        WHERE ma.framework_id = f.id AND ma.deleted_at IS NULL
      )
    ORDER BY days_since_creation DESC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    frameworkId: r.framework_id,
    frameworkTitle: r.framework_title,
    frameworkType: r.framework_type,
    daysSinceCreation: r.days_since_creation || 0,
  }));
}
