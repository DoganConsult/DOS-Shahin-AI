import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int as count
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  total: number;
  unread: number;
  actionRequired: number;
  overdue: number;
  readRate: number;
  avgResponseMinutes: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'unread')::int AS unread,
      COUNT(*) FILTER (WHERE action_required = true AND status NOT IN ('actioned', 'archived', 'deleted'))::int AS action_required,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('actioned', 'archived', 'deleted'))::int AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE read_at IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS read_rate,
      COALESCE(AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 60) FILTER (WHERE read_at IS NOT NULL), 0)::int AS avg_response_minutes
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    total: row.total || 0,
    unread: row.unread || 0,
    actionRequired: row.action_required || 0,
    overdue: row.overdue || 0,
    readRate: Number(row.read_rate || 0),
    avgResponseMinutes: row.avg_response_minutes || 0,
  };
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '<1h'
        WHEN created_at > NOW() - INTERVAL '4 hours' THEN '1-4h'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN '4-24h'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '1-7d'
        ELSE '7d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL AND status = 'unread'
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function getChannelBreakdown(tenantId: string): Promise<Array<{ channel: string; total: number; unread: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(channel, 'in_app') AS channel,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'unread')::int AS unread
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
    GROUP BY channel ORDER BY total DESC
  `);
  return result.rows;
}

export async function getPriorityDistribution(tenantId: string): Promise<Array<{ priority: string; total: number; unread: number; overdue: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(priority, 'medium') AS priority,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'unread')::int AS unread,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('actioned', 'archived', 'deleted'))::int AS overdue
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
    GROUP BY priority ORDER BY
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `);
  return result.rows;
}

export async function getUnreadByRecipient(tenantId: string, limit = 20): Promise<Array<{ recipientId: string; unreadCount: number; oldestUnread: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      recipient_id,
      COUNT(*)::int AS unread_count,
      MIN(created_at) AS oldest_unread
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL AND status = 'unread'
    GROUP BY recipient_id
    ORDER BY unread_count DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    recipientId: r.recipient_id,
    unreadCount: r.unread_count,

    oldestUnread: r.oldest_unread?.toISOString?.() ?? r.oldest_unread,
  }));
}

export async function getActionRequiredByModule(tenantId: string): Promise<Array<{ sourceModule: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(related_module, 'unknown') AS source_module,
      COUNT(*)::int AS count
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
      AND action_required = true
      AND status NOT IN ('actioned', 'archived', 'deleted')
    GROUP BY related_module
    ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({ sourceModule: r.source_module, count: r.count }));
}

export async function getExpiringMessages(tenantId: string, withinHours = 24): Promise<Array<{ id: string; subject: string; recipientId: string; expiresAt: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, subject, recipient_id, expires_at
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
      AND expires_at IS NOT NULL
      AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour' * $1
      AND status NOT IN ('actioned', 'archived', 'deleted')
    ORDER BY expires_at ASC
  `, [withinHours]);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    subject: r.subject,
    recipientId: r.recipient_id,

    expiresAt: r.expires_at?.toISOString?.() ?? r.expires_at,
  }));
}

export async function getThreadDepthStats(tenantId: string): Promise<{ avgDepth: number; maxDepth: number; totalThreads: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(DISTINCT thread_id)::int AS total_threads,
      COALESCE(AVG(thread_count), 0)::numeric(5,2) AS avg_depth,
      COALESCE(MAX(thread_count), 0)::int AS max_depth
    FROM (
      SELECT thread_id, COUNT(*)::int AS thread_count
      FROM "${schema}".inbox_messages
      WHERE deleted_at IS NULL AND thread_id IS NOT NULL
      GROUP BY thread_id
    ) sub
  `);
  const row = result.rows[0] || {};
  return {
    totalThreads: row.total_threads || 0,
    avgDepth: Number(row.avg_depth || 0),
    maxDepth: row.max_depth || 0,
  };
}

export async function getReadRateMetrics(tenantId: string): Promise<{
  overall: number;
  byChannel: Array<{ channel: string; readRate: number }>;
  byPriority: Array<{ priority: string; readRate: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const overallResult = await safeQuery(`
    SELECT CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE read_at IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
      ELSE 0 END AS rate
    FROM "${schema}".inbox_messages WHERE deleted_at IS NULL
  `);
  const byChannelResult = await safeQuery(`
    SELECT COALESCE(channel, 'in_app') AS channel,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE read_at IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0 END AS rate
    FROM "${schema}".inbox_messages WHERE deleted_at IS NULL
    GROUP BY channel
  `);
  const byPriorityResult = await safeQuery(`
    SELECT COALESCE(priority, 'medium') AS priority,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE read_at IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0 END AS rate
    FROM "${schema}".inbox_messages WHERE deleted_at IS NULL
    GROUP BY priority
  `);
  return {
    overall: Number(overallResult.rows[0]?.rate || 0),

    byChannel: byChannelResult.rows.map(( r: Record<string, unknown>) => ({ channel: r.channel, readRate: Number(r.rate) })),

    byPriority: byPriorityResult.rows.map(( r: Record<string, unknown>) => ({ priority: r.priority, readRate: Number(r.rate) })),
  };
}

export async function getResponseTimeMetrics(tenantId: string): Promise<{
  avgMinutes: number;
  p50Minutes: number;
  p95Minutes: number;
  byPriority: Array<{ priority: string; avgMinutes: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 60)::int AS avg_min,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (read_at - created_at)) / 60)::int AS p50_min,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (read_at - created_at)) / 60)::int AS p95_min
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL AND read_at IS NOT NULL
  `);
  const byPriorityResult = await safeQuery(`
    SELECT COALESCE(priority, 'medium') AS priority,
      AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 60)::int AS avg_min
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL AND read_at IS NOT NULL
    GROUP BY priority
  `);
  const row = result.rows[0] || {};
  return {
    avgMinutes: row.avg_min || 0,
    p50Minutes: row.p50_min || 0,
    p95Minutes: row.p95_min || 0,

    byPriority: byPriorityResult.rows.map(( r: Record<string, unknown>) => ({ priority: r.priority, avgMinutes: r.avg_min || 0 })),
  };
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  channel?: string;
  priority?: string;
  recipientId?: string;
  relatedModule?: string;
  actionRequired?: boolean;
  unreadOnly?: boolean;
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
  if (params.priority) { conditions.push(`priority = $${idx}`); values.push(params.priority); idx++; }
  if (params.recipientId) { conditions.push(`recipient_id = $${idx}`); values.push(params.recipientId); idx++; }
  if (params.relatedModule) { conditions.push(`related_module = $${idx}`); values.push(params.relatedModule); idx++; }
  if (params.actionRequired) { conditions.push(`action_required = true`); }
  if (params.unreadOnly) { conditions.push(`status = 'unread'`); }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int as total FROM "${schema}".inbox_messages WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".inbox_messages WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.channel) { conditions.push(`channel = $${idx}`); values.push(filters.channel); idx++; }
  if (filters?.priority) { conditions.push(`priority = $${idx}`); values.push(filters.priority); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".inbox_messages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 10000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT m.*, m.related_entity_id AS linked_entity_id
    FROM "${schema}".inbox_messages m
    WHERE m.deleted_at IS NULL AND m.related_module = $1
    ORDER BY m.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getSlaBreach(tenantId: string): Promise<Array<{ id: string; subject: string; recipientId: string; priority: string; ageHours: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, subject, recipient_id, priority,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
    FROM "${schema}".inbox_messages
    WHERE deleted_at IS NULL
      AND status = 'unread'
      AND (
        (priority = 'critical' AND created_at < NOW() - INTERVAL '1 hour') OR
        (priority = 'high' AND created_at < NOW() - INTERVAL '4 hours') OR
        (priority = 'medium' AND created_at < NOW() - INTERVAL '24 hours') OR
        (priority = 'low' AND created_at < NOW() - INTERVAL '72 hours')
      )
    ORDER BY
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    subject: r.subject,
    recipientId: r.recipient_id,
    priority: r.priority,
    ageHours: Math.round(Number(r.age_hours) * 10) / 10,
  }));
}
