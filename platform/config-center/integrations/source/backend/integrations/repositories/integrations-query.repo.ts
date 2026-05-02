import { safeQuery, tenantSchema } from '../ports/database.port';
import { INTEGRATIONS_BUSINESS_THRESHOLDS } from '../data/integrations-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".integration_connectors
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
  degraded: number;
  errorRate: number;
  avgSyncIntervalMinutes: number;
  staleConnectors: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
      CASE WHEN COUNT(*) FILTER (WHERE status = 'active') > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'active' AND last_sync_error IS NOT NULL)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status = 'active'), 0)::numeric * 100, 2)
        ELSE 0
      END AS error_rate,
      COALESCE(AVG(EXTRACT(MINUTE FROM NOW() - last_sync_at)) FILTER (WHERE status = 'active' AND last_sync_at IS NOT NULL), 0)::int AS avg_sync_interval,
      COUNT(*) FILTER (WHERE status = 'active' AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '${INTEGRATIONS_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'))::int AS stale
    FROM "${schema}".integration_connectors WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    degraded: row.degraded || 0,
    errorRate: Number(row.error_rate) || 0,
    avgSyncIntervalMinutes: row.avg_sync_interval || 0,
    staleConnectors: row.stale || 0,
  };
}

export async function getConnectorTypeBreakdown(tenantId: string): Promise<Array<{
  connectorType: string; count: number; activeCount: number; degradedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(connector_type, 'custom') AS connector_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded_count
    FROM "${schema}".integration_connectors WHERE deleted_at IS NULL
    GROUP BY connector_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    connectorType: r.connector_type,
    count: r.count,
    activeCount: r.active_count,
    degradedCount: r.degraded_count,
  }));
}

export async function getDegradedConnectors(tenantId: string): Promise<Array<{
  id: string; name: string; connectorType: string; lastSyncError: string; hoursSinceSync: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, name, connector_type, last_sync_error,
      COALESCE(EXTRACT(HOUR FROM NOW() - last_sync_at), 9999)::int AS hours_since_sync
    FROM "${schema}".integration_connectors
    WHERE deleted_at IS NULL AND (status = 'degraded' OR last_sync_error IS NOT NULL)
    ORDER BY last_sync_at ASC NULLS FIRST LIMIT 50
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name || 'unnamed',
    connectorType: r.connector_type || 'custom',
    lastSyncError: r.last_sync_error || '',
    hoursSinceSync: r.hours_since_sync || 9999,
  }));
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  connectorType?: string;
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
  if (params.query) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.connectorType) { conditions.push(`connector_type = $${idx}`); values.push(params.connectorType); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".integration_connectors WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".integration_connectors WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.connectorType) { conditions.push(`connector_type = $${idx}`); values.push(filters.connectorType); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".integration_connectors WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT c.id, c.name, c.status, c.connector_type, c.last_sync_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".integration_connectors c
    JOIN "${schema}".entity_links el ON el.source_entity_id = c.id AND el.source_module = 'integrations'
    WHERE c.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY c.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
