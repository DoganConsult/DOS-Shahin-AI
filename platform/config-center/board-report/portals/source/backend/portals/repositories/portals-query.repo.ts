import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".portals_portals
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalPortals: number;
  activePortals: number;
  draftPortals: number;
  suspendedPortals: number;
  totalTokens: number;
  activeTokens: number;
  totalPages: number;
  publishedPages: number;
  activeSessions: number;
}> {
  const schema = tenantSchema(tenantId);
  const [portalResult, tokenResult, pageResult, sessionResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
      FROM "${schema}".portals_portals WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_revoked = false AND expires_at > NOW())::int AS active
      FROM "${schema}".portal_tokens
    `).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published
      FROM "${schema}".portal_pages
    `).catch(() => ({ rows: [{ total: 0, published: 0 }] })),
    safeQuery(`
      SELECT COUNT(*)::int AS active
      FROM "${schema}".portal_sessions WHERE is_active = true AND expires_at > NOW()
    `).catch(() => ({ rows: [{ active: 0 }] })),
  ]);
  const p = portalResult.rows[0] || {};
  const t = tokenResult.rows[0] || {};
  const pg = pageResult.rows[0] || {};
  const s = sessionResult.rows[0] || {};
  return {
    totalPortals: p.total || 0,
    activePortals: p.active || 0,
    draftPortals: p.draft || 0,
    suspendedPortals: p.suspended || 0,
    totalTokens: t.total || 0,
    activeTokens: t.active || 0,
    totalPages: pg.total || 0,
    publishedPages: pg.published || 0,
    activeSessions: s.active || 0,
  };
}

export async function getPortalTypeBreakdown(tenantId: string): Promise<Array<{ portalType: string; count: number; activeCount: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      portal_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count
    FROM "${schema}".portals_portals
    WHERE deleted_at IS NULL
    GROUP BY portal_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    portalType: r.portal_type,
    count: r.count,
    activeCount: r.active_count,
  }));
}

export async function getAccessStats(tenantId: string): Promise<{
  totalLogs: number;
  last24h: number;
  last7d: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [countResult, actionResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d,
        COUNT(DISTINCT external_user_id)::int AS unique_users
      FROM "${schema}".portal_access_logs
    `).catch(() => ({ rows: [{ total: 0, last_24h: 0, last_7d: 0, unique_users: 0 }] })),
    safeQuery(`
      SELECT action, COUNT(*)::int AS count
      FROM "${schema}".portal_access_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY action ORDER BY count DESC LIMIT 10
    `).catch(() => ({ rows: [] })),
  ]);
  const c = countResult.rows[0] || {};
  return {
    totalLogs: c.total || 0,
    last24h: c.last_24h || 0,
    last7d: c.last_7d || 0,
    uniqueUsers: c.unique_users || 0,

    topActions: actionResult.rows.map(( r: Record<string, unknown>) => ({ action: r.action, count: r.count })),
  };
}

export async function getActiveSessions(tenantId: string): Promise<Array<{
  sessionId: string;
  portalId: string;
  portalTitle: string;
  externalUserId: string;
  ipAddress: string;
  startedAt: string;
  expiresAt: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT s.session_id, s.portal_id, p.title AS portal_title,
      s.external_user_id, s.ip_address, s.started_at, s.expires_at
    FROM "${schema}".portal_sessions s
    LEFT JOIN "${schema}".portals_portals p ON p.id = s.portal_id
    WHERE s.is_active = true AND s.expires_at > NOW()
    ORDER BY s.started_at DESC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    sessionId: r.session_id,
    portalId: r.portal_id,
    portalTitle: r.portal_title || '',
    externalUserId: r.external_user_id,
    ipAddress: r.ip_address,

    startedAt: r.started_at?.toISOString?.() || r.started_at,

    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,
  }));
}

export async function getExpiredTokens(tenantId: string): Promise<Array<{
  tokenId: string;
  portalId: string;
  externalUserId: string;
  externalOrg: string;
  expiresAt: string;
  lastUsedAt: string | null;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT token_id, portal_id, external_user_id, external_org, expires_at, last_used_at
    FROM "${schema}".portal_tokens
    WHERE is_revoked = false AND expires_at < NOW()
    ORDER BY expires_at DESC LIMIT 200
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    tokenId: r.token_id,
    portalId: r.portal_id,
    externalUserId: r.external_user_id,
    externalOrg: r.external_org || '',

    expiresAt: r.expires_at?.toISOString?.() || r.expires_at,

    lastUsedAt: r.last_used_at ? (r.last_used_at?.toISOString?.() || r.last_used_at) : null,
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
    FROM "${schema}".portals_portals
    WHERE deleted_at IS NULL AND status NOT IN ('archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  portalType?: string;
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
  if (params.portalType) { conditions.push(`portal_type = $${idx}`); values.push(params.portalType); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".portals_portals WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".portals_portals WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['p.deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`p.status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.portalType) { conditions.push(`p.portal_type = $${idx}`); values.push(filters.portalType); idx++; }
  const result = await safeQuery(`
    SELECT p.*,
      (SELECT COUNT(*)::int FROM "${schema}".portal_pages pg WHERE pg.portal_id = p.id) AS page_count,
      (SELECT COUNT(*)::int FROM "${schema}".portal_tokens tk WHERE tk.portal_id = p.id AND tk.is_revoked = false) AS token_count
    FROM "${schema}".portals_portals p
    WHERE ${conditions.join(' AND ')} ORDER BY p.created_at DESC LIMIT 5000
  `, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT p.id, p.title, p.portal_type, p.status, p.access_level,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".portals_portals p
    JOIN "${schema}".entity_links el ON el.source_entity_id = p.id AND el.source_module = 'portals'
    WHERE p.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY p.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
