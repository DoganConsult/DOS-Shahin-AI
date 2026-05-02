import { safeQuery, tenantSchema } from '../ports/database.port';
import { NOTIFICATION_BUSINESS_THRESHOLDS as _NOTIFICATION_BUSINESS_THRESHOLDS } from '../data/notification-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalSent: number;
  deliveryRate: number;
  readRate: number;
  failedCount: number;
  bounceRate: number;
  avgDeliverySeconds: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read'))::int AS total_sent,
      COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS total_delivered,
      COUNT(*) FILTER (WHERE status = 'read')::int AS total_read,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE status NOT IN ('pending', 'archived'))::int AS total_attempted,
      COALESCE(AVG(EXTRACT(EPOCH FROM sent_at::timestamp - created_at)) FILTER (WHERE sent_at IS NOT NULL), 0)::int AS avg_delivery_secs
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'
  `);
  const row = result.rows[0] || {};
  const totalAttempted = row.total_attempted || 0;
  const totalSent = row.total_sent || 0;
  return {
    totalSent,
    deliveryRate: totalAttempted > 0 ? Number(((row.total_delivered || 0) / totalAttempted * 100).toFixed(2)) : 0,
    readRate: totalSent > 0 ? Number(((row.total_read || 0) / totalSent * 100).toFixed(2)) : 0,
    failedCount: row.failed_count || 0,
    bounceRate: totalAttempted > 0 ? Number(((row.failed_count || 0) / totalAttempted * 100).toFixed(2)) : 0,
    avgDeliverySeconds: row.avg_delivery_secs || 0,
  };
}

export async function getChannelBreakdown(tenantId: string): Promise<Array<{
  channel: string; count: number; deliveredCount: number; failedCount: number; readCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(channel, 'in_app') AS channel,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS delivered_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE status = 'read')::int AS read_count
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY channel ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    channel: r.channel,
    count: r.count,
    deliveredCount: r.delivered_count,
    failedCount: r.failed_count,
    readCount: r.read_count,
  }));
}

export async function getHourlyTrend(tenantId: string): Promise<Array<{
  hour: string; sentCount: number; failedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00') AS hour,
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read'))::int AS sent_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', created_at)
    ORDER BY DATE_TRUNC('hour', created_at) ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    hour: r.hour,
    sentCount: r.sent_count,
    failedCount: r.failed_count,
  }));
}

export async function getFailedNotifications(tenantId: string): Promise<Array<{
  id: string; channel: string; recipientId: string; subject: string; createdAt: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, channel, recipient_id, subject, created_at
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL AND status = 'failed'
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    channel: r.channel,
    recipientId: r.recipient_id,
    subject: r.subject,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '0-1h'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN '1-24h'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '1-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        ELSE '30d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".notification_notifications
    WHERE deleted_at IS NULL AND status = 'pending'
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  channel?: string;
  recipientId?: string;
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
  if (params.query) { conditions.push(`(subject ILIKE $${idx} OR body ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.channel) { conditions.push(`channel = $${idx}`); values.push(params.channel); idx++; }
  if (params.recipientId) { conditions.push(`recipient_id = $${idx}`); values.push(params.recipientId); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".notification_notifications WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".notification_notifications WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.channel) { conditions.push(`channel = $${idx}`); values.push(filters.channel); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".notification_notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT n.id, n.channel, n.subject, n.status, n.recipient_id, n.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".notification_notifications n
    JOIN "${schema}".entity_links el ON el.source_entity_id = n.id AND el.source_module = 'notification'
    WHERE n.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY n.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
