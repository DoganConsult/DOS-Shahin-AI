import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".privacy_dsrs
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalDsrs: number;
  activeDsrs: number;
  overdueDsrs: number;
  completionRate: number;
  avgResolutionDays: number;
  totalBreaches: number;
  openBreaches: number;
  totalConsents: number;
  expiredConsents: number;
}> {
  const schema = tenantSchema(tenantId);
  const [dsrResult, breachResult, consentResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'in_progress'))::int AS active,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'closed', 'archived'))::int AS overdue,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status IN ('completed', 'closed'))::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0
        END AS completion_rate,
        COALESCE(AVG(EXTRACT(DAY FROM completed_at - created_at)) FILTER (WHERE completed_at IS NOT NULL), 0)::int AS avg_resolution
      FROM "${schema}".privacy_dsrs WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved'))::int AS open_count
      FROM "${schema}".privacy_breach_records WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{ total: 0, open_count: 0 }] })),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE expires_at < NOW() AND revoked = false)::int AS expired
      FROM "${schema}".privacy_consent_records
    `).catch(() => ({ rows: [{ total: 0, expired: 0 }] })),
  ]);
  const d = dsrResult.rows[0] || {};
  const b = breachResult.rows[0] || {};
  const c = consentResult.rows[0] || {};
  return {
    totalDsrs: d.total || 0,
    activeDsrs: d.active || 0,
    overdueDsrs: d.overdue || 0,
    completionRate: Number(d.completion_rate) || 0,
    avgResolutionDays: d.avg_resolution || 0,
    totalBreaches: b.total || 0,
    openBreaches: b.open_count || 0,
    totalConsents: c.total || 0,
    expiredConsents: c.expired || 0,
  };
}

export async function getDsrTypeBreakdown(tenantId: string): Promise<Array<{ requestType: string; count: number; overdueCount: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      request_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'closed', 'archived'))::int AS overdue_count
    FROM "${schema}".privacy_dsrs WHERE deleted_at IS NULL
    GROUP BY request_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    requestType: r.request_type,
    count: r.count,
    overdueCount: r.overdue_count,
  }));
}

export async function getRegulationBreakdown(tenantId: string): Promise<Array<{ regulation: string; count: number; completedCount: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      regulation,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status IN ('completed', 'closed'))::int AS completed_count
    FROM "${schema}".privacy_dsrs WHERE deleted_at IS NULL
    GROUP BY regulation ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    regulation: r.regulation,
    count: r.count,
    completedCount: r.completed_count,
  }));
}

export async function getOpenBreaches(tenantId: string): Promise<Array<{
  id: string; title: string; severity: string; status: string;
  affectedCount: number; detectedAt: string; notifiedAt: string | null;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, severity, status, affected_individuals_count,
      detected_at, regulator_notified_at
    FROM "${schema}".privacy_breach_records
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'resolved')
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, detected_at ASC
    LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    affectedCount: r.affected_individuals_count || 0,

    detectedAt: r.detected_at?.toISOString?.() || r.detected_at,

    notifiedAt: r.regulator_notified_at ? (r.regulator_notified_at?.toISOString?.() || r.regulator_notified_at) : null,
  }));
}

export async function getConsentExpiryReport(tenantId: string): Promise<Array<{
  id: string; subjectId: string; purpose: string; expiresAt: string; daysUntilExpiry: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, subject_id, purpose, expires_at,
      EXTRACT(DAY FROM expires_at - NOW())::int AS days_until_expiry
    FROM "${schema}".privacy_consent_records
    WHERE revoked = false AND expires_at IS NOT NULL
      AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    ORDER BY expires_at ASC LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    subjectId: r.subject_id,
    purpose: r.purpose,

    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,
    daysUntilExpiry: r.days_until_expiry || 0,
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
    FROM "${schema}".privacy_dsrs
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  requestType?: string;
  regulation?: string;
  urgency?: string;
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
  if (params.query) { conditions.push(`(subject_name ILIKE $${idx} OR subject_email ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.requestType) { conditions.push(`request_type = $${idx}`); values.push(params.requestType); idx++; }
  if (params.regulation) { conditions.push(`regulation = $${idx}`); values.push(params.regulation); idx++; }
  if (params.urgency) { conditions.push(`urgency = $${idx}`); values.push(params.urgency); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".privacy_dsrs WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".privacy_dsrs WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.requestType) { conditions.push(`request_type = $${idx}`); values.push(filters.requestType); idx++; }
  if (filters?.regulation) { conditions.push(`regulation = $${idx}`); values.push(filters.regulation); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".privacy_dsrs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT d.dsr_id AS id, d.subject_name, d.request_type, d.regulation, d.status,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".privacy_dsrs d
    JOIN "${schema}".entity_links el ON el.source_entity_id = d.dsr_id AND el.source_module = 'privacy'
    WHERE d.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY d.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
