import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".records_records
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalRecords: number;
  activeRecords: number;
  onLegalHold: number;
  overdueDisposal: number;
  noRetentionPolicy: number;
  disposedThisMonth: number;
  avgRetentionDays: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE legal_hold = true)::int AS on_hold,
      COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date < NOW() AND status NOT IN ('disposed'))::int AS overdue_disposal,
      COUNT(*) FILTER (WHERE retention_period IS NULL AND status NOT IN ('disposed', 'archived'))::int AS no_retention,
      COUNT(*) FILTER (WHERE status = 'disposed' AND updated_at > DATE_TRUNC('month', NOW()))::int AS disposed_this_month,
      COALESCE(AVG(retention_period) FILTER (WHERE retention_period IS NOT NULL), 0)::int AS avg_retention
    FROM "${schema}".records_records WHERE deleted_at IS NULL
  `);
  const r = result.rows[0] || {};
  return {
    totalRecords: r.total || 0,
    activeRecords: r.active || 0,
    onLegalHold: r.on_hold || 0,
    overdueDisposal: r.overdue_disposal || 0,
    noRetentionPolicy: r.no_retention || 0,
    disposedThisMonth: r.disposed_this_month || 0,
    avgRetentionDays: r.avg_retention || 0,
  };
}

export async function getClassificationBreakdown(tenantId: string): Promise<Array<{ classification: string; count: number; onHold: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      classification,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE legal_hold = true)::int AS on_hold
    FROM "${schema}".records_records WHERE deleted_at IS NULL
    GROUP BY classification ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({ classification: r.classification, count: r.count, onHold: r.on_hold }));
}

export async function getRetentionCompliance(tenantId: string): Promise<{
  totalActive: number;
  withRetention: number;
  withoutRetention: number;
  compliancePct: number;
  byRecordType: Array<{ recordType: string; total: number; compliant: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [summary, byType] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE retention_period IS NOT NULL)::int AS with_retention,
        COUNT(*) FILTER (WHERE retention_period IS NULL)::int AS without_retention
      FROM "${schema}".records_records WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
    `),
    safeQuery(`
      SELECT record_type,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE retention_period IS NOT NULL)::int AS compliant
      FROM "${schema}".records_records WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
      GROUP BY record_type ORDER BY total DESC
    `),
  ]);
  const s = summary.rows[0] || {};
  const total = s.total || 0;
  return {
    totalActive: total,
    withRetention: s.with_retention || 0,
    withoutRetention: s.without_retention || 0,
    compliancePct: total > 0 ? Math.round(((s.with_retention || 0) / total) * 100) : 0,

    byRecordType: byType.rows.map(( r: Record<string, unknown>) => ({ recordType: r.record_type, total: r.total, compliant: r.compliant })),
  };
}

export async function getDisposalQueue(tenantId: string): Promise<Array<{
  id: string; title: string; recordType: string; classification: string;
  disposalDate: string; legalHold: boolean; daysOverdue: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, record_type, classification, disposal_date, legal_hold,
      EXTRACT(DAY FROM NOW() - disposal_date)::int AS days_overdue
    FROM "${schema}".records_records
    WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
      AND disposal_date IS NOT NULL AND disposal_date < NOW()
    ORDER BY disposal_date ASC LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id, title: r.title, recordType: r.record_type,
    classification: r.classification,

    disposalDate: r.disposal_date?.toISOString?.() || r.disposal_date,
    legalHold: r.legal_hold || false,
    daysOverdue: r.days_overdue || 0,
  }));
}

export async function getLegalHolds(tenantId: string): Promise<Array<{
  id: string; title: string; recordType: string; classification: string;
  createdAt: string; holdSince: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, record_type, classification, created_at, updated_at AS hold_since
    FROM "${schema}".records_records
    WHERE deleted_at IS NULL AND legal_hold = true
    ORDER BY updated_at DESC LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id, title: r.title, recordType: r.record_type,
    classification: r.classification,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    holdSince: r.hold_since?.toISOString?.() || r.hold_since,
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
    FROM "${schema}".records_records
    WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  recordType?: string;
  classification?: string;
  legalHold?: boolean;
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
  if (params.recordType) { conditions.push(`record_type = $${idx}`); values.push(params.recordType); idx++; }
  if (params.classification) { conditions.push(`classification = $${idx}`); values.push(params.classification); idx++; }
  if (params.legalHold !== undefined) { conditions.push(`legal_hold = $${idx}`); values.push(params.legalHold); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".records_records WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".records_records WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.recordType) { conditions.push(`record_type = $${idx}`); values.push(filters.recordType); idx++; }
  if (filters?.classification) { conditions.push(`classification = $${idx}`); values.push(filters.classification); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".records_records WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT r.id, r.title, r.record_type, r.classification, r.status, r.legal_hold,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".records_records r
    JOIN "${schema}".entity_links el ON el.source_entity_id = r.id AND el.source_module = 'records'
    WHERE r.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY r.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
