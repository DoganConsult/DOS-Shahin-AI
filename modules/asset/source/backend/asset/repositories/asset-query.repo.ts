import { safeQuery, tenantSchema } from '../ports/database.port';
import { ASSET_BUSINESS_THRESHOLDS as _ASSET_BUSINESS_THRESHOLDS, ASSET_TIMEOUTS } from '../data/asset-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".asset_assets
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
  unclassified: number;
  criticalCount: number;
  unowned: number;
  overdueReview: number;
  classificationRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE classification IS NULL OR classification = '')::int AS unclassified,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_count,
      COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS unowned,
      COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS} days' AND status = 'active')::int AS overdue_review,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE classification IS NOT NULL AND classification != '')::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS classification_rate
    FROM "${schema}".asset_assets WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    unclassified: row.unclassified || 0,
    criticalCount: row.critical_count || 0,
    unowned: row.unowned || 0,
    overdueReview: row.overdue_review || 0,
    classificationRate: Number(row.classification_rate) || 0,
  };
}

export async function getTypeBreakdown(tenantId: string): Promise<Array<{
  assetType: string; count: number; activeCount: number; criticalCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(asset_type, 'unspecified') AS asset_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_count
    FROM "${schema}".asset_assets WHERE deleted_at IS NULL
    GROUP BY asset_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    assetType: r.asset_type,
    count: r.count,
    activeCount: r.active_count,
    criticalCount: r.critical_count,
  }));
}

export async function getClassificationBreakdown(tenantId: string): Promise<Array<{
  classification: string; count: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(classification, 'unclassified') AS classification,
      COUNT(*)::int AS count
    FROM "${schema}".asset_assets WHERE deleted_at IS NULL
    GROUP BY classification
    ORDER BY CASE classification
      WHEN 'top_secret' THEN 1 WHEN 'restricted' THEN 2 WHEN 'confidential' THEN 3
      WHEN 'internal' THEN 4 WHEN 'public' THEN 5 ELSE 6 END
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    classification: r.classification,
    count: r.count,
  }));
}

export async function getUnclassifiedAssets(tenantId: string): Promise<Array<{
  id: string; title: string; assetType: string; status: string; daysSinceCreation: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, asset_type, status,
      EXTRACT(DAY FROM NOW() - created_at)::int AS days_since_creation
    FROM "${schema}".asset_assets
    WHERE deleted_at IS NULL AND (classification IS NULL OR classification = '')
      AND status NOT IN ('disposed', 'archived')
    ORDER BY created_at ASC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    assetType: r.asset_type || 'unspecified',
    status: r.status,
    daysSinceCreation: r.days_since_creation || 0,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '0-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '365 days' THEN '91-365d'
        WHEN created_at > NOW() - INTERVAL '730 days' THEN '1-2y'
        ELSE '2y+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".asset_assets
    WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  assetType?: string;
  classification?: string;
  criticality?: string;
  environment?: string;
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
  if (params.assetType) { conditions.push(`asset_type = $${idx}`); values.push(params.assetType); idx++; }
  if (params.classification) { conditions.push(`classification = $${idx}`); values.push(params.classification); idx++; }
  if (params.criticality) { conditions.push(`criticality = $${idx}`); values.push(params.criticality); idx++; }
  if (params.environment) { conditions.push(`environment = $${idx}`); values.push(params.environment); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".asset_assets WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".asset_assets WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.assetType) { conditions.push(`asset_type = $${idx}`); values.push(filters.assetType); idx++; }
  if (filters?.classification) { conditions.push(`classification = $${idx}`); values.push(filters.classification); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".asset_assets WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT a.id, a.title, a.status, a.asset_type, a.classification, a.criticality,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".asset_assets a
    JOIN "${schema}".entity_links el ON el.source_entity_id = a.id AND el.source_module = 'asset'
    WHERE a.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY a.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
