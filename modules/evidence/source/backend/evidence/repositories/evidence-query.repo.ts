import { safeQuery, tenantSchema } from '../ports/database.port';
import { EVIDENCE_SLA_DEFAULTS, EVIDENCE_BUSINESS_THRESHOLDS } from '../data/evidence-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".evidence_evidences
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalEvidence: number;
  acceptedEvidence: number;
  pendingReview: number;
  expiringWithin30d: number;
  collectionRate: number;
  avgReviewDays: number;
  rejectionRate: number;
  overdueCollection: number;
}> {
  const schema = tenantSchema(tenantId);
  // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_evidence,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_evidence,
      COUNT(*) FILTER (WHERE status = 'under_review')::int AS pending_review,
      COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status NOT IN ('expired', 'archived', 'rejected'))::int AS expiring_within_30d,
      CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived')) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'accepted'))::numeric / COUNT(*) FILTER (WHERE status NOT IN ('draft', 'archived'))::numeric * 100, 2)
        ELSE 0
      END AS collection_rate,
      COALESCE(AVG(EXTRACT(DAY FROM updated_at - created_at)) FILTER (WHERE status IN ('accepted', 'rejected')), 0)::numeric(6,2) AS avg_review_days,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'rejected')::numeric / COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected'))::numeric * 100, 2)
        ELSE 0
      END AS rejection_rate,
      COUNT(*) FILTER (WHERE status = 'collecting' AND created_at < NOW() - INTERVAL '${EVIDENCE_SLA_DEFAULTS.high} hours')::int AS overdue_collection
    FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    totalEvidence: row.total_evidence || 0,
    acceptedEvidence: row.accepted_evidence || 0,
    pendingReview: row.pending_review || 0,
    expiringWithin30d: row.expiring_within_30d || 0,
    collectionRate: Number(row.collection_rate) || 0,
    avgReviewDays: Number(row.avg_review_days) || 0,
    rejectionRate: Number(row.rejection_rate) || 0,
    overdueCollection: row.overdue_collection || 0,
  };
}

export async function getEvidenceTypeBreakdown(tenantId: string): Promise<Array<{
  evidenceType: string;
  count: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  expiredCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(evidence_type, 'document') AS evidence_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_count,
      COUNT(*) FILTER (WHERE status IN ('collecting', 'submitted', 'under_review'))::int AS pending_count,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_count,
      COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_count
    FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL
    GROUP BY evidence_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    evidenceType: r.evidence_type,
    count: r.count,
    acceptedCount: r.accepted_count,
    pendingCount: r.pending_count,
    rejectedCount: r.rejected_count,
    expiredCount: r.expired_count,
  }));
}

export async function getCollectionProgress(tenantId: string): Promise<Array<{
  status: string;
  count: number;
  percentage: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      status,
      COUNT(*)::int AS count,
      ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2)::numeric(6,2) AS percentage
    FROM "${schema}".evidence_evidences
    WHERE deleted_at IS NULL AND status IN ('draft', 'collecting', 'submitted', 'under_review', 'accepted', 'rejected', 'expired', 'archived')
    GROUP BY status
    ORDER BY CASE status
      WHEN 'draft' THEN 1 WHEN 'collecting' THEN 2 WHEN 'submitted' THEN 3
      WHEN 'under_review' THEN 4 WHEN 'accepted' THEN 5 WHEN 'rejected' THEN 6
      WHEN 'expired' THEN 7 WHEN 'archived' THEN 8 ELSE 9
    END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    status: r.status,
    count: r.count,
    percentage: Number(r.percentage) || 0,
  }));
}

export async function getExpiringEvidence(tenantId: string, withinDays: number = 30): Promise<Array<{
  id: string;
  title: string;
  evidenceType: string;
  status: string;
  expiresAt: string;
  daysUntilExpiry: number;
  controlId: string | null;
  framework: string | null;
}>> {
  const schema = tenantSchema(tenantId);
  // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
  const result = await safeQuery(`
    SELECT
      e.id,
      e.title,
      COALESCE(e.evidence_type, 'document') AS evidence_type,
      e.status,
      e.expires_at,
      EXTRACT(DAY FROM e.expires_at - NOW())::int AS days_until_expiry,
      e.control_id,
      e.framework
    FROM "${schema}".evidence_evidences e
    WHERE e.deleted_at IS NULL
      AND e.expires_at BETWEEN NOW() AND NOW() + INTERVAL '${withinDays} days'
      AND e.status NOT IN ('expired', 'archived', 'rejected')
    ORDER BY e.expires_at ASC
    LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    evidenceType: r.evidence_type,
    status: r.status,
    expiresAt: r.expires_at,
    daysUntilExpiry: r.days_until_expiry || 0,
    controlId: r.control_id || null,
    framework: r.framework || null,
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
    FROM "${schema}".evidence_evidences
    WHERE deleted_at IS NULL AND status NOT IN ('accepted', 'archived', 'rejected')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  evidenceType?: string;
  controlId?: string;
  framework?: string;
  collectionMethod?: string;
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
  if (params.evidenceType) { conditions.push(`evidence_type = $${idx}`); values.push(params.evidenceType); idx++; }
  if (params.controlId) { conditions.push(`control_id = $${idx}`); values.push(params.controlId); idx++; }
  if (params.framework) { conditions.push(`framework = $${idx}`); values.push(params.framework); idx++; }
  if (params.collectionMethod) { conditions.push(`collection_method = $${idx}`); values.push(params.collectionMethod); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".evidence_evidences WHERE ${where}`, values);
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".evidence_evidences WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
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
  if (filters?.evidenceType) { conditions.push(`evidence_type = $${idx}`); values.push(filters.evidenceType); idx++; }
  if (filters?.framework) { conditions.push(`framework = $${idx}`); values.push(filters.framework); idx++; }
  if (filters?.controlId) { conditions.push(`control_id = $${idx}`); values.push(filters.controlId); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence_evidences WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`,
    values,
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT e.id, e.title, e.status, e.evidence_type, e.framework, e.control_id, e.expires_at, e.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".evidence_evidences e
    JOIN "${schema}".entity_links el ON el.source_entity_id = e.id AND el.source_module = 'evidence'
    WHERE e.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY e.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getComplianceCoverageByFramework(tenantId: string): Promise<Array<{
  framework: string;
  totalControls: number;
  controlsWithEvidence: number;
  acceptedEvidence: number;
  coveragePercent: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(e.framework, 'unassigned') AS framework,
      COUNT(DISTINCT e.control_id) FILTER (WHERE e.control_id IS NOT NULL)::int AS controls_with_evidence,
      COUNT(*) FILTER (WHERE e.status = 'accepted')::int AS accepted_evidence,
      COUNT(*)::int AS total_evidence
    FROM "${schema}".evidence_evidences e
    WHERE e.deleted_at IS NULL AND e.framework IS NOT NULL
    GROUP BY e.framework ORDER BY accepted_evidence DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    framework: r.framework,
    totalControls: r.total_evidence,
    controlsWithEvidence: r.controls_with_evidence,
    acceptedEvidence: r.accepted_evidence,
    coveragePercent: (r as any).total_evidence > 0

      ? Math.round((r.accepted_evidence / r.total_evidence) * 100)
      : 0,
  }));
}

export async function getStaleEvidence(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  status: string;
  evidenceType: string;
  daysSinceUpdate: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      id,
      title,
      status,
      COALESCE(evidence_type, 'document') AS evidence_type,
      EXTRACT(DAY FROM NOW() - updated_at)::int AS days_since_update
    FROM "${schema}".evidence_evidences
    WHERE deleted_at IS NULL
      AND status NOT IN ('accepted', 'archived', 'rejected', 'expired')
      AND updated_at < NOW() - INTERVAL '${EVIDENCE_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'
    ORDER BY updated_at ASC
    LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    evidenceType: r.evidence_type,
    daysSinceUpdate: r.days_since_update || 0,
  }));
}
