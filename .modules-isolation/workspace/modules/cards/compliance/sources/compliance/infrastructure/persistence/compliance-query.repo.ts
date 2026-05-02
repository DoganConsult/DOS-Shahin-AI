import { safeQuery, tenantSchema } from '../../ports/database.port';
import { COMPLIANCE_SLA_DEFAULTS as _COMPLIANCE_SLA_DEFAULTS, COMPLIANCE_BUSINESS_THRESHOLDS as _COMPLIANCE_BUSINESS_THRESHOLDS, COMPLIANCE_LIMITS } from '../data/compliance-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".compliance_programs
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalPrograms: number;
  activePrograms: number;
  compliantPrograms: number;
  partiallyCompliantPrograms: number;
  nonCompliantPrograms: number;
  complianceRate: number;
  openGaps: number;
  criticalGaps: number;
  overdueRemediations: number;
  avgAssessmentCycleDays: number;
}> {
  const schema = tenantSchema(tenantId);
  const [programResult, gapResult, assessmentResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('archived'))::int AS active,
        COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
        COUNT(*) FILTER (WHERE status = 'partially_compliant')::int AS partially_compliant,
        COUNT(*) FILTER (WHERE status = 'non_compliant')::int AS non_compliant,
        CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE status = 'compliant')::numeric /
            COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived'))::numeric * 100, 2)
          ELSE 0
        END AS compliance_rate
      FROM "${schema}".compliance_programs WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COUNT(*)::int AS open_gaps,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'accepted'))::int AS critical_gaps,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'accepted'))::int AS overdue_remediations
      FROM "${schema}".compliance_gaps WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COALESCE(AVG(EXTRACT(DAY FROM completed_at - started_at)) FILTER (WHERE completed_at IS NOT NULL), 0)::int AS avg_cycle_days
      FROM "${schema}".compliance_assessments WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
  ]);

  const p = programResult.rows[0] || {};
  const g = gapResult.rows[0] || {};
  const a = assessmentResult.rows[0] || {};

  return {
    totalPrograms: p.total || 0,
    activePrograms: p.active || 0,
    compliantPrograms: p.compliant || 0,
    partiallyCompliantPrograms: p.partially_compliant || 0,
    nonCompliantPrograms: p.non_compliant || 0,
    complianceRate: Number(p.compliance_rate) || 0,
    openGaps: g.open_gaps || 0,
    criticalGaps: g.critical_gaps || 0,
    overdueRemediations: g.overdue_remediations || 0,
    avgAssessmentCycleDays: a.avg_cycle_days || 0,
  };
}

export async function getFrameworkComplianceRate(tenantId: string): Promise<Array<{
  frameworkCode: string;
  frameworkNameEn: string;
  totalPrograms: number;
  compliantPrograms: number;
  complianceRate: number;
  openGaps: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(p.framework_code, 'unknown') AS framework_code,
      COALESCE(p.framework_name_en, p.framework_code, 'Unknown') AS framework_name_en,
      COUNT(*)::int AS total_programs,
      COUNT(*) FILTER (WHERE p.status = 'compliant')::int AS compliant_programs,
      CASE WHEN COUNT(*) FILTER (WHERE p.status NOT IN ('draft', 'archived')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE p.status = 'compliant')::numeric /
          COUNT(*) FILTER (WHERE p.status NOT IN ('draft', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS compliance_rate,
      COALESCE(g.open_gaps, 0) AS open_gaps
    FROM "${schema}".compliance_programs p
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS open_gaps
      FROM "${schema}".compliance_gaps cg
      WHERE cg.program_id = p.id AND cg.deleted_at IS NULL AND cg.status NOT IN ('closed', 'accepted')
    ) g ON true
    WHERE p.deleted_at IS NULL
    GROUP BY p.framework_code, p.framework_name_en, g.open_gaps
    ORDER BY compliance_rate ASC
  `).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    frameworkCode: r.framework_code,
    frameworkNameEn: r.framework_name_en,
    totalPrograms: r.total_programs,
    compliantPrograms: r.compliant_programs,
    complianceRate: Number(r.compliance_rate) || 0,
    openGaps: r.open_gaps || 0,
  }));
}

export async function getGapAnalysisSummary(tenantId: string): Promise<{
  bySeverity: Array<{ severity: string; count: number; overdueCount: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byFramework: Array<{ frameworkCode: string; gapCount: number; criticalCount: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [severityResult, statusResult, frameworkResult] = await Promise.all([
    safeQuery(`
      SELECT
        COALESCE(severity, 'minor') AS severity,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'accepted'))::int AS overdue_count
      FROM "${schema}".compliance_gaps
      WHERE deleted_at IS NULL
      GROUP BY severity
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 WHEN 'minor' THEN 3 WHEN 'observation' THEN 4 ELSE 5 END
    `).catch(() => ({ rows: [] })),
    safeQuery(`
      SELECT status, COUNT(*)::int AS count
      FROM "${schema}".compliance_gaps
      WHERE deleted_at IS NULL
      GROUP BY status ORDER BY count DESC
    `).catch(() => ({ rows: [] })),
    safeQuery(`
      SELECT
        COALESCE(p.framework_code, 'unknown') AS framework_code,
        COUNT(cg.id)::int AS gap_count,
        COUNT(cg.id) FILTER (WHERE cg.severity = 'critical')::int AS critical_count
      FROM "${schema}".compliance_programs p
      JOIN "${schema}".compliance_gaps cg ON cg.program_id = p.id AND cg.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.framework_code
      ORDER BY gap_count DESC
    `).catch(() => ({ rows: [] })),
  ]);

  return {

    bySeverity: severityResult.rows.map(( r: Record<string, unknown>) => ({
      severity: r.severity,
      count: r.count,
      overdueCount: r.overdue_count || 0,
    })),

    byStatus: statusResult.rows.map(( r: Record<string, unknown>) => ({ status: r.status, count: r.count })),

    byFramework: frameworkResult.rows.map(( r: Record<string, unknown>) => ({
      frameworkCode: r.framework_code,
      gapCount: r.gap_count,
      criticalCount: r.critical_count || 0,
    })),
  };
}

export async function getNonCompliantItems(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  frameworkCode: string;
  status: string;
  regulatoryBody: string;
  daysInNonCompliance: number;
  openGaps: number;
  criticalGaps: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      p.id,
      p.title,
      COALESCE(p.framework_code, 'unknown') AS framework_code,
      p.status,
      COALESCE(p.regulatory_body, '') AS regulatory_body,
      EXTRACT(DAY FROM NOW() - p.updated_at)::int AS days_in_non_compliance,
      COUNT(cg.id)::int AS open_gaps,
      COUNT(cg.id) FILTER (WHERE cg.severity = 'critical')::int AS critical_gaps
    FROM "${schema}".compliance_programs p
    LEFT JOIN "${schema}".compliance_gaps cg ON cg.program_id = p.id AND cg.deleted_at IS NULL AND cg.status NOT IN ('closed', 'accepted')
    WHERE p.deleted_at IS NULL AND p.status IN ('non_compliant', 'partially_compliant')
    GROUP BY p.id, p.title, p.framework_code, p.status, p.regulatory_body, p.updated_at
    ORDER BY CASE p.status WHEN 'non_compliant' THEN 1 WHEN 'partially_compliant' THEN 2 ELSE 3 END,
             critical_gaps DESC, days_in_non_compliance DESC
    LIMIT $1
  `, [COMPLIANCE_LIMITS.MAX_EXPORT_ROWS]).catch(() => ({ rows: [] }));

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    frameworkCode: r.framework_code,
    status: r.status,
    regulatoryBody: r.regulatory_body,
    daysInNonCompliance: r.days_in_non_compliance || 0,
    openGaps: r.open_gaps || 0,
    criticalGaps: r.critical_gaps || 0,
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
        ELSE '90d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".compliance_programs
    WHERE deleted_at IS NULL AND status NOT IN ('archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  framework?: string;
  complianceStatus?: string;
  regulatoryBody?: string;
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
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.framework) { conditions.push(`framework_code = $${idx}`); values.push(params.framework); idx++; }
  if (params.complianceStatus) { conditions.push(`status = $${idx}`); values.push(params.complianceStatus); idx++; }
  if (params.regulatoryBody) { conditions.push(`regulatory_body = $${idx}`); values.push(params.regulatoryBody); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".compliance_programs WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".compliance_programs WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.framework) { conditions.push(`framework_code = $${idx}`); values.push(filters.framework); idx++; }
  if (filters?.regulatoryBody) { conditions.push(`regulatory_body = $${idx}`); values.push(filters.regulatoryBody); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".compliance_programs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx}`,
    [...values, COMPLIANCE_LIMITS.MAX_EXPORT_ROWS],
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT p.id, p.title, p.status, p.framework_code, p.regulatory_body, p.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".compliance_programs p
    JOIN "${schema}".entity_links el ON el.source_entity_id = p.id AND el.source_module = 'compliance'
    WHERE p.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY p.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
