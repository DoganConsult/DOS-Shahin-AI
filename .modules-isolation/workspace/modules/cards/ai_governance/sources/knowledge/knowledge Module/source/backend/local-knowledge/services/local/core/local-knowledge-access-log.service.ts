// ============================================
// AGRC-OS -- Local Knowledge Access Log Service
// Comprehensive access logging, analytics, and audit trails
// for the local knowledge base.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import type { GenericRow } from '@dos/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Allowed access actions for logging. */
export type AccessAction = 'search' | 'view' | 'download' | 'query' | 'read' | 'export' | 'publish' | 'delete' | 'archive' | 'grant' | 'revoke';

/** Source channel from which the access originated. */
export type AccessSource = 'api' | 'copilot' | 'widget';

/** Entry payload for recording an access event. */
export interface AccessLogEntry {
  userId: string;
  documentId?: string;
  chunkIds?: string[];
  queryText?: string;
  action: AccessAction;
  resultCount?: number;
  responseTimeMs?: number;
  source?: AccessSource;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  userRole?: string;
  granted?: boolean;
  reason?: string;
}

/** Filters for querying access log entries. */
export interface AccessLogFilters {
  userId?: string;
  documentId?: string;
  action?: AccessAction;
  startDate?: string; // ISO-8601
  endDate?: string;   // ISO-8601
  limit?: number;
  offset?: number;
}

/** Single row returned by access log queries. */
export interface AccessLogRow {
  accessId: string;
  tenantId: string;
  documentId: string | null;
  userId: string;
  userRole: string | null;
  accessType: string;
  granted: boolean;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  chunkIds: string[] | null;
  queryText: string | null;
  resultCount: number | null;
  responseTimeMs: number | null;
  source: string | null;
  sessionId: string | null;
  accessedAt: string;
}

/** Time range for analytics queries. */
export interface TimeRange {
  startDate?: string; // ISO-8601
  endDate?: string;   // ISO-8601
}

/** Analytics dashboard data shape. */
export interface AccessAnalytics {
  mostAccessedDocuments: Array<{ documentId: string; title: string | null; accessCount: number }>;
  mostActiveUsers: Array<{ userId: string; accessCount: number }>;
  popularQueries: Array<{ queryText: string; frequency: number }>;
  accessTrends: Array<{ date: string; accessCount: number }>;
  averageResponseTimeMs: number | null;
  actionDistribution: Array<{ action: string; count: number }>;
}

// ---------------------------------------------------------------------------
// logAccess
// ---------------------------------------------------------------------------

/**
 * Record a knowledge base access event.
 * Inserts a row into `local_knowledge_access_log` with all available context.
 */
export async function logAccess(tenantId: string, entry: AccessLogEntry): Promise<string> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `INSERT INTO ${schema}.local_knowledge_access_log
        (tenant_id, document_id, user_id, user_role, access_type, granted, reason,
         ip_address, user_agent, chunk_ids, query_text, result_count,
         response_time_ms, source, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9, $10, $11, $12, $13, $14, $15)
       RETURNING access_id`,
      [
        tenantId,
        entry.documentId ?? null,
        entry.userId,
        entry.userRole ?? null,
        entry.action,
        entry.granted ?? true,
        entry.reason ?? null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.chunkIds && entry.chunkIds.length > 0 ? entry.chunkIds : null,
        entry.queryText ?? null,
        entry.resultCount ?? null,
        entry.responseTimeMs ?? null,
        entry.source ?? null,
        entry.sessionId ?? null,
      ],
    );

    const accessId = result.rows[0]?.access_id ?? '';
    logger.debug(`[AccessLog] Recorded access ${accessId} for user=${entry.userId} action=${entry.action}`);
    return accessId;
  } catch (err) {
    logger.error('[AccessLog] Failed to record access', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// getAccessLog
// ---------------------------------------------------------------------------

/**
 * Query the access log with optional filters and pagination.
 * Returns rows joined with document title for convenience.
 */
export async function getAccessLog(
  tenantId: string,
  filters?: AccessLogFilters,
): Promise<{ data: AccessLogRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['al.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (filters?.userId) {
    conditions.push(`al.user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters?.documentId) {
    conditions.push(`al.document_id = $${paramIdx++}`);
    params.push(filters.documentId);
  }
  if (filters?.action) {
    conditions.push(`al.access_type = $${paramIdx++}`);
    params.push(filters.action);
  }
  if (filters?.startDate) {
    conditions.push(`al.accessed_at >= $${paramIdx++}`);
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    conditions.push(`al.accessed_at <= $${paramIdx++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = filters?.offset ?? 0;

  // Total count
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total
       FROM ${schema}.local_knowledge_access_log al
      WHERE ${whereClause}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Data with optional document title join
  const dataResult = await safeQuery(
    `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at,
            d.title AS document_title
       FROM ${schema}.local_knowledge_access_log al
       LEFT JOIN ${schema}.local_knowledge_documents d
         ON d.document_id = al.document_id
      WHERE ${whereClause}
      ORDER BY al.accessed_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );

  const data: AccessLogRow[] = dataResult.rows.map(mapAccessLogRow);
  return { data, total };
}

// ---------------------------------------------------------------------------
// getAccessAnalytics
// ---------------------------------------------------------------------------

/**
 * Produce analytics dashboard data for the knowledge base access log.
 * Includes top documents, top users, popular queries, trends, response times,
 * and action distribution.
 */
export async function getAccessAnalytics(
  tenantId: string,
  timeRange?: TimeRange,
): Promise<AccessAnalytics> {
  const schema = tenantSchema(tenantId);
  const { timeCondition, timeParams, nextIdx: _nextIdx } = buildTimeCondition(tenantId, timeRange);

  // Run all analytics queries in parallel for efficiency
  const [topDocs, topUsers, popularQueries, trends, avgResponse, actionDist] = await Promise.all([
    // Most accessed documents (top 10)
    safeQuery(
      `SELECT al.document_id, d.title, COUNT(*)::int AS access_count
         FROM ${schema}.local_knowledge_access_log al
         LEFT JOIN ${schema}.local_knowledge_documents d ON d.document_id = al.document_id
        WHERE ${timeCondition} AND al.document_id IS NOT NULL
        GROUP BY al.document_id, d.title
        ORDER BY access_count DESC
        LIMIT 10`,
      timeParams,
    ),

    // Most active users (top 10)
    safeQuery(
      `SELECT al.user_id, COUNT(*)::int AS access_count
         FROM ${schema}.local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY al.user_id
        ORDER BY access_count DESC
        LIMIT 10`,
      timeParams,
    ),

    // Popular search queries (top 20)
    safeQuery(
      `SELECT LOWER(TRIM(al.query_text)) AS query_text, COUNT(*)::int AS frequency
         FROM ${schema}.local_knowledge_access_log al
        WHERE ${timeCondition} AND al.query_text IS NOT NULL AND al.query_text <> ''
        GROUP BY LOWER(TRIM(al.query_text))
        ORDER BY frequency DESC
        LIMIT 20`,
      timeParams,
    ),

    // Access trends (daily counts)
    safeQuery(
      `SELECT DATE(al.accessed_at) AS date, COUNT(*)::int AS access_count
         FROM ${schema}.local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY DATE(al.accessed_at)
        ORDER BY date ASC`,
      timeParams,
    ),

    // Average response time
    safeQuery(
      `SELECT ROUND(AVG(al.response_time_ms))::int AS avg_response_time_ms
         FROM ${schema}.local_knowledge_access_log al
        WHERE ${timeCondition} AND al.response_time_ms IS NOT NULL`,
      timeParams,
    ),

    // Action distribution
    safeQuery(
      `SELECT al.access_type AS action, COUNT(*)::int AS count
         FROM ${schema}.local_knowledge_access_log al
        WHERE ${timeCondition}
        GROUP BY al.access_type
        ORDER BY count DESC`,
      timeParams,
    ),
  ]);

  return {
    mostAccessedDocuments: topDocs.rows.map((r: GenericRow) => ({
      documentId: r.document_id,
      title: r.title ?? null,
      accessCount: r.access_count,
    })),
    mostActiveUsers: topUsers.rows.map((r: GenericRow) => ({
      userId: r.user_id,
      accessCount: r.access_count,
    })),
    popularQueries: popularQueries.rows.map((r: GenericRow) => ({
      queryText: r.query_text,
      frequency: r.frequency,
    })),
    accessTrends: trends.rows.map((r: GenericRow) => ({
      date: r.date,
      accessCount: r.access_count,
    })),
    averageResponseTimeMs: avgResponse.rows[0]?.avg_response_time_ms ?? null,
    actionDistribution: actionDist.rows.map((r: GenericRow) => ({
      action: r.action,
      count: r.count,
    })),
  };
}

// ---------------------------------------------------------------------------
// getDocumentAccessHistory
// ---------------------------------------------------------------------------

/**
 * Retrieve the full access trail for a specific document.
 * Useful for audit and compliance reporting.
 */
export async function getDocumentAccessHistory(
  tenantId: string,
  documentId: string,
): Promise<AccessLogRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at
       FROM ${schema}.local_knowledge_access_log al
      WHERE al.tenant_id = $1 AND al.document_id = $2
      ORDER BY al.accessed_at DESC
      LIMIT 500`,
    [tenantId, documentId],
  );

  return result.rows.map(mapAccessLogRow);
}

// ---------------------------------------------------------------------------
// getUserAccessHistory
// ---------------------------------------------------------------------------

/**
 * Retrieve the full access trail for a specific user.
 * Useful for user activity auditing.
 */
export async function getUserAccessHistory(
  tenantId: string,
  userId: string,
): Promise<AccessLogRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT al.access_id, al.tenant_id, al.document_id, al.user_id, al.user_role,
            al.access_type, al.granted, al.reason, al.ip_address::text, al.user_agent,
            al.chunk_ids, al.query_text, al.result_count, al.response_time_ms,
            al.source, al.session_id, al.accessed_at
       FROM ${schema}.local_knowledge_access_log al
      WHERE al.tenant_id = $1 AND al.user_id = $2
      ORDER BY al.accessed_at DESC
      LIMIT 500`,
    [tenantId, userId],
  );

  return result.rows.map(mapAccessLogRow);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a raw DB row to the AccessLogRow interface. */
function mapAccessLogRow( r: Record<string, unknown>): AccessLogRow {
  return {

    accessId: r.access_id,

    tenantId: r.tenant_id,

    documentId: r.document_id ?? null,

    userId: r.user_id,

    userRole: r.user_role ?? null,

    accessType: r.access_type,

    granted: r.granted,

    reason: r.reason ?? null,

    ipAddress: r.ip_address ?? null,

    userAgent: r.user_agent ?? null,

    chunkIds: r.chunk_ids ?? null,

    queryText: r.query_text ?? null,

    resultCount: r.result_count ?? null,

    responseTimeMs: r.response_time_ms ?? null,

    source: r.source ?? null,

    sessionId: r.session_id ?? null,

    accessedAt: r.accessed_at,
  };
}

/**
 * Build a WHERE clause fragment that filters by tenant_id and optional time range.
 * Returns the clause text, params array, and the next available param index.
 */
function buildTimeCondition(
  tenantId: string,
  timeRange?: TimeRange,
): { timeCondition: string; timeParams: unknown[]; nextIdx: number } {
  const parts: string[] = ['al.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (timeRange?.startDate) {
    parts.push(`al.accessed_at >= $${idx++}`);
    params.push(timeRange.startDate);
  }
  if (timeRange?.endDate) {
    parts.push(`al.accessed_at <= $${idx++}`);
    params.push(timeRange.endDate);
  }

  return { timeCondition: parts.join(' AND '), timeParams: params, nextIdx: idx };
}
