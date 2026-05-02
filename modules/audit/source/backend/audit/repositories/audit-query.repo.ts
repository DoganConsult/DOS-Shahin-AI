import { safeQuery, tenantSchema } from '../ports/database.port';
import { AUDIT_SLA_DEFAULTS as _AUDIT_SLA_DEFAULTS, AUDIT_BUSINESS_THRESHOLDS as _AUDIT_BUSINESS_THRESHOLDS } from '../data/audit-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int as count
    FROM "${schema}".audit_audits
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalAudits: number;
  activeAudits: number;
  openFindings: number;
  overdueFindings: number;
  overdueAudits: number;
  avgAuditDurationDays: number;
  findingsClosureRate: number;
  criticalFindingsOpen: number;
  completionRate: number;
}> {
  const schema = tenantSchema(tenantId);

  const [auditResult, findingResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total_audits,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active_audits,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived') AND end_date < NOW())::int AS overdue_audits,
        COALESCE(AVG(
          EXTRACT(DAY FROM COALESCE(
            CASE WHEN status IN ('closed', 'archived') THEN updated_at ELSE NULL END,
            NOW()
          ) - created_at)
        ) FILTER (WHERE status IN ('closed', 'archived')), 0)::numeric(10,1) AS avg_duration_days,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0
        END AS completion_rate
      FROM "${schema}".audit_audits WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total_findings,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated'))::int AS open_findings,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated') AND severity = 'critical')::int AS critical_open,
        COUNT(*) FILTER (WHERE
          status NOT IN ('closed', 'remediated')
          AND due_date < NOW()
        )::int AS overdue_findings,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'remediated'))::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0
        END AS closure_rate
      FROM "${schema}".findings WHERE deleted_at IS NULL
    `),
  ]);

  const ar = auditResult.rows[0] || {};
  const fr = findingResult.rows[0] || {};

  return {
    totalAudits: ar.total_audits || 0,
    activeAudits: ar.active_audits || 0,
    openFindings: fr.open_findings || 0,
    overdueFindings: fr.overdue_findings || 0,
    overdueAudits: ar.overdue_audits || 0,
    avgAuditDurationDays: Number(ar.avg_duration_days) || 0,
    findingsClosureRate: Number(fr.closure_rate) || 0,
    criticalFindingsOpen: fr.critical_open || 0,
    completionRate: Number(ar.completion_rate) || 0,
  };
}

export async function getAuditTypeBreakdown(tenantId: string): Promise<Array<{
  auditType: string;
  count: number;
  activeCount: number;
  closedCount: number;
  avgDurationDays: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(audit_type, 'internal') AS audit_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::int AS active_count,
      COUNT(*) FILTER (WHERE status IN ('closed', 'archived'))::int AS closed_count,
      COALESCE(AVG(
        EXTRACT(DAY FROM COALESCE(
          CASE WHEN status IN ('closed', 'archived') THEN updated_at ELSE NULL END,
          NOW()
        ) - created_at)
      ) FILTER (WHERE status IN ('closed', 'archived')), 0)::numeric(10,1) AS avg_duration_days
    FROM "${schema}".audit_audits WHERE deleted_at IS NULL
    GROUP BY audit_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    auditType: r.audit_type,
    count: r.count,
    activeCount: r.active_count,
    closedCount: r.closed_count,
    avgDurationDays: Number(r.avg_duration_days) || 0,
  }));
}

export async function getFindingSeverityBreakdown(tenantId: string): Promise<Array<{
  severity: string;
  count: number;
  openCount: number;
  overdueCount: number;
  closureRate: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(severity, 'medium') AS severity,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated'))::int AS open_count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'remediated') AND due_date < NOW())::int AS overdue_count,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'remediated'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS closure_rate
    FROM "${schema}".findings WHERE deleted_at IS NULL
    GROUP BY severity
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    severity: r.severity,
    count: r.count,
    openCount: r.open_count,
    overdueCount: r.overdue_count,
    closureRate: Number(r.closure_rate) || 0,
  }));
}

export async function getOpenFindings(tenantId: string, params: {
  page?: number;
  pageSize?: number;
  severity?: string;
  auditId?: string;
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [
    `f.deleted_at IS NULL`,
    `f.status NOT IN ('closed', 'remediated')`,
  ];
  const values: unknown[] = [];
  let idx = 1;

  if (params.severity) { conditions.push(`f.severity = $${idx}`); values.push(params.severity); idx++; }
  if (params.auditId) { conditions.push(`f.audit_id = $${idx}`); values.push(params.auditId); idx++; }

  const where = conditions.join(' AND ');

  const [countResult, dataResult] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".findings f
       WHERE ${where}`,
      values,
    ),
    safeQuery(
      `SELECT
         f.finding_id, f.audit_id, f.title, f.severity, f.status,
         f.due_date, f.owner, f.created_at,
         EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open,
         CASE WHEN f.due_date IS NOT NULL AND f.due_date < NOW() THEN true ELSE false END AS is_overdue,
         a.title AS audit_title, a.audit_type
       FROM "${schema}".findings f
       LEFT JOIN "${schema}".audit_audits a ON a.id = f.audit_id AND a.deleted_at IS NULL
       WHERE ${where}
       ORDER BY
         CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
         f.created_at ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageSize, offset],
    ),
  ]);

  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
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
    FROM "${schema}".audit_audits
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  auditType?: string;
  severity?: string;
  auditorId?: string;
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
    conditions.push(`(title ILIKE $${idx} OR scope ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.auditType) { conditions.push(`audit_type = $${idx}`); values.push(params.auditType); idx++; }
  if (params.auditorId) { conditions.push(`lead_auditor_id = $${idx}`); values.push(params.auditorId); idx++; }

  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int as total FROM "${schema}".audit_audits WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".audit_audits WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.auditType) { conditions.push(`audit_type = $${idx}`); values.push(filters.auditType); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".audit_audits WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`,
    values,
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.*, el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".audit_audits e
    LEFT JOIN "${schema}".entity_links el ON el.source_entity_id = e.id AND el.source_module = 'audit'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
