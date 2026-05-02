import { safeQuery, tenantSchema } from '../ports/database.port';
import { INCIDENT_SLA_DEFAULTS, INCIDENT_BUSINESS_THRESHOLDS as _INCIDENT_BUSINESS_THRESHOLDS } from '../data/incident-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".incident_incidents
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
  criticalOpen: number;
  mttrHours: number;
  resolutionRate: number;
  slaBreachRate: number;
}> {
  const schema = tenantSchema(tenantId);
  // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'archived'))::int AS active,
      COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved', 'closed', 'archived'))::int AS critical_open,
      COALESCE(AVG(EXTRACT(HOUR FROM updated_at - created_at)) FILTER (WHERE status IN ('resolved', 'closed')), 0)::int AS mttr_hours,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS resolution_rate,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND
            EXTRACT(HOUR FROM updated_at - created_at) >
              CASE severity WHEN 'critical' THEN ${INCIDENT_SLA_DEFAULTS.critical} WHEN 'high' THEN ${INCIDENT_SLA_DEFAULTS.high} WHEN 'medium' THEN ${INCIDENT_SLA_DEFAULTS.medium} ELSE ${INCIDENT_SLA_DEFAULTS.low} END
          )::numeric /
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::numeric * 100, 2)
        ELSE 0
      END AS sla_breach_rate
    FROM "${schema}".incident_incidents WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    criticalOpen: row.critical_open || 0,
    mttrHours: row.mttr_hours || 0,
    resolutionRate: Number(row.resolution_rate) || 0,
    slaBreachRate: Number(row.sla_breach_rate) || 0,
  };
}

export async function getSeverityBreakdown(tenantId: string): Promise<Array<{
  severity: string; count: number; openCount: number; avgResolutionHours: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(severity, 'medium') AS severity,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'archived'))::int AS open_count,
      COALESCE(AVG(EXTRACT(HOUR FROM updated_at - created_at)) FILTER (WHERE status IN ('resolved', 'closed')), 0)::int AS avg_resolution
    FROM "${schema}".incident_incidents WHERE deleted_at IS NULL
    GROUP BY severity
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    severity: r.severity,
    count: r.count,
    openCount: r.open_count,
    avgResolutionHours: r.avg_resolution || 0,
  }));
}

export async function getTypeBreakdown(tenantId: string): Promise<Array<{
  incidentType: string; count: number; openCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(incident_type, 'other') AS incident_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'archived'))::int AS open_count
    FROM "${schema}".incident_incidents WHERE deleted_at IS NULL
    GROUP BY incident_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    incidentType: r.incident_type,
    count: r.count,
    openCount: r.open_count,
  }));
}

export async function getActiveIncidents(tenantId: string): Promise<Array<{
  id: string; title: string; severity: string; status: string; incidentType: string; hoursOpen: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, severity, status, incident_type,
      EXTRACT(HOUR FROM NOW() - created_at)::int AS hours_open
    FROM "${schema}".incident_incidents
    WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed', 'archived')
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at ASC
    LIMIT 50
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    incidentType: r.incident_type,
    hoursOpen: r.hours_open || 0,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '0-1h'
        WHEN created_at > NOW() - INTERVAL '4 hours' THEN '1-4h'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN '4-24h'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '1-7d'
        ELSE '7d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".incident_incidents
    WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  severity?: string;
  incidentType?: string;
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
  if (params.severity) { conditions.push(`severity = $${idx}`); values.push(params.severity); idx++; }
  if (params.incidentType) { conditions.push(`incident_type = $${idx}`); values.push(params.incidentType); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".incident_incidents WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".incident_incidents WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.severity) { conditions.push(`severity = $${idx}`); values.push(filters.severity); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".incident_incidents WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT i.id, i.title, i.status, i.severity, i.incident_type, i.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".incident_incidents i
    JOIN "${schema}".entity_links el ON el.source_entity_id = i.id AND el.source_module = 'incident'
    WHERE i.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY i.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
