import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int as count
    FROM "${schema}".issues WHERE deleted_at IS NULL GROUP BY status
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
  criticalOpen: number;
  slaBreachCount: number;
  avgResolutionHours: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived', 'resolved'))::int AS active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue,
      COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'archived', 'resolved'))::int AS critical_open,
      COUNT(*) FILTER (WHERE (metadata->>'sla_breached')::boolean = true AND status NOT IN ('closed', 'archived'))::int AS sla_breach_count,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('closed', 'resolved', 'archived'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0 END AS completion_rate,
      COALESCE(AVG((metadata->>'resolution_time_hours')::numeric) FILTER (WHERE status IN ('resolved','closed')), 0)::numeric(8,2) AS avg_resolution_hours
    FROM "${schema}".issues WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    overdue: row.overdue || 0,
    criticalOpen: row.critical_open || 0,
    slaBreachCount: row.sla_breach_count || 0,
    completionRate: Number(row.completion_rate || 0),
    avgResolutionHours: Number(row.avg_resolution_hours || 0),
  };
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN '<1d'
        WHEN created_at > NOW() - INTERVAL '3 days' THEN '1-3d'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '3-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '7-30d'
        ELSE '30d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".issues
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived', 'resolved')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function getSeverityDistribution(tenantId: string): Promise<Array<{ severity: string; total: number; active: number; overdue: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      severity,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived', 'resolved'))::int AS active,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue
    FROM "${schema}".issues WHERE deleted_at IS NULL
    GROUP BY severity ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `);
  return result.rows;
}

export async function getSourceModuleBreakdown(tenantId: string): Promise<Array<{ sourceModule: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT COALESCE(source_module, 'manual') AS source_module, COUNT(*)::int AS count
    FROM "${schema}".issues WHERE deleted_at IS NULL
    GROUP BY source_module ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({ sourceModule: r.source_module, count: r.count }));
}

export async function getAssigneeWorkload(tenantId: string, limit = 20): Promise<Array<{ assignedTo: string; openCount: number; criticalCount: number; overdueCount: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      assigned_to,
      COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived', 'resolved'))::int AS open_count,
      COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'archived', 'resolved'))::int AS critical_count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved'))::int AS overdue_count
    FROM "${schema}".issues
    WHERE assigned_to IS NOT NULL AND deleted_at IS NULL
    GROUP BY assigned_to ORDER BY open_count DESC LIMIT $1
  `, [limit]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    assignedTo: r.assigned_to,
    openCount: r.open_count,
    criticalCount: r.critical_count,
    overdueCount: r.overdue_count,
  }));
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  category?: string;
  severity?: string;
  assignedTo?: string;
  sourceModule?: string;
  overdueOnly?: boolean;
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
  if (params.category) { conditions.push(`category = $${idx}`); values.push(params.category); idx++; }
  if (params.severity) { conditions.push(`severity = $${idx}`); values.push(params.severity); idx++; }
  if (params.assignedTo) { conditions.push(`assigned_to = $${idx}`); values.push(params.assignedTo); idx++; }
  if (params.sourceModule) { conditions.push(`source_module = $${idx}`); values.push(params.sourceModule); idx++; }
  if (params.overdueOnly) { conditions.push(`due_date < NOW() AND status NOT IN ('closed', 'archived', 'resolved')`); }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".issues WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".issues WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.severity) { conditions.push(`severity = $${idx}`); values.push(filters.severity); idx++; }
  if (filters?.category) { conditions.push(`category = $${idx}`); values.push(filters.category); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".issues WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.*, el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".issues e
    LEFT JOIN "${schema}".entity_links el ON el.source_entity_id = e.issue_id::text AND el.source_module = 'issues'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getSlaBreach(tenantId: string): Promise<Array<{ issueId: string; title: string; severity: string; ageHours: number; assignedTo: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT issue_id, title, severity, assigned_to,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
    FROM "${schema}".issues
    WHERE deleted_at IS NULL
      AND status NOT IN ('closed', 'archived', 'resolved')
      AND (
        (severity = 'critical' AND created_at < NOW() - INTERVAL '4 hours') OR
        (severity = 'high' AND created_at < NOW() - INTERVAL '24 hours') OR
        (severity = 'medium' AND created_at < NOW() - INTERVAL '72 hours') OR
        (severity = 'low' AND created_at < NOW() - INTERVAL '168 hours')
      )
    ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    issueId: r.issue_id,
    title: r.title,
    severity: r.severity,
    ageHours: Math.round(Number(r.age_hours) * 10) / 10,
    assignedTo: r.assigned_to || 'unassigned',
  }));
}
