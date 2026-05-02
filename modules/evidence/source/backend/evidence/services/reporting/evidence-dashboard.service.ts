// ============================================================================
// Shahin -- Evidence Dashboard Service
// Dashboard computation service for the evidence command center and work
// queue views. Supports caching via evidence_dashboard_cache table to avoid
// repeated heavy aggregations on every page load.
// ============================================================================

import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { eventBus } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';

// ── Types ──

export interface CommandCenterWidgets {
  totalEvidence: number;
  activeEvidence: number;
  expiringSoon: number;
  expired: number;
  pendingReviews: number;
  overdueRequests: number;
  avgQualityScore: number;
  automatedCollectionRate: number;
  freshnessRate: number;
  reuseRate: number;
  statusBreakdown: { status: string; count: number }[];
  sourceBreakdown: { sourceType: string; count: number }[];
  qualityDistribution: { tier: string; count: number }[];
}

export interface WorkQueueItem {
  id: string;
  type: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface WorkQueueResult {
  requestsAssigned: GenericRow[];
  reviewsPending: GenericRow[];
  expiringItems: GenericRow[];
  rejectedNeedingRework: GenericRow[];
  packageRequests: GenericRow[];
  collectionFailures: GenericRow[];
}

// ── Default cache TTL (5 minutes) ──
const DEFAULT_CACHE_TTL = 300;

// ── Public API ──

/**
 * Compute all command center KPI widgets for the evidence module.
 * Aggregates metrics from evidence, evidence_requests, evidence_reviews,
 * evidence_quality_assessments, and evidence_packages tables.
 */
export async function computeCommandCenterWidgets(
  tenantId: string,
): Promise<CommandCenterWidgets> {
  const schema = tenantSchema(tenantId);

  // 1. Core evidence counts
  const coreResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ total: 0, active: 0, expiring_soon: 0, expired: 0, connector_pull: 0, manual_upload: 0, fresh: 0, reusable: 0 }]),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('active', 'approved', 'submitted', 'under_review'))::int AS active,
         COUNT(*) FILTER (
           WHERE valid_to IS NOT NULL
             AND valid_to >= NOW()
             AND valid_to < NOW() + INTERVAL '30 days'
             AND status NOT IN ('deleted', 'archived', 'expired')
         )::int AS expiring_soon,
         COUNT(*) FILTER (
           WHERE status = 'expired'
             OR (valid_to IS NOT NULL AND valid_to < NOW() AND status NOT IN ('deleted', 'archived'))
         )::int AS expired,
         COUNT(*) FILTER (
           WHERE COALESCE(source_type, source_system_name, '') IN ('connector_pull', 'pipeline', 'automated', 'connector', 'api', 'integration')
         )::int AS connector_pull,
         COUNT(*) FILTER (
           WHERE COALESCE(source_type, source_system_name, '') IN ('', 'manual_upload', 'manual', 'user')
             OR (source_type IS NULL AND source_system_name IS NULL)
         )::int AS manual_upload,
         COUNT(*) FILTER (
           WHERE freshness_status = 'current'
             OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
         )::int AS fresh,
         COUNT(*) FILTER (WHERE reusable_flag = true)::int AS reusable
       FROM "${schema}".evidence
       WHERE status != 'deleted'`,
    ),
    { tenantId, operation: 'commandCenter:coreStats' },
  );

  const core = getFirstRow(coreResult) || {};

  const totalEvidence = Number(core.total) || 0;

  const activeEvidence = Number(core.active) || 0;

  const expiringSoon = Number(core.expiring_soon) || 0;

  const expired = Number(core.expired) || 0;

  const connectorPull = Number(core.connector_pull) || 0;

  const manualUpload = Number(core.manual_upload) || 0;

  const freshCount = Number(core.fresh) || 0;

  const reusableCount = Number(core.reusable) || 0;

  // Automated collection rate
  const totalSourced = connectorPull + manualUpload;
  const automatedCollectionRate = totalSourced > 0
    ? Math.round((connectorPull / totalSourced) * 10000) / 100
    : 0;

  // Freshness rate (% of non-deleted evidence that is fresh)
  const nonDeletedTotal = totalEvidence;
  const freshnessRate = nonDeletedTotal > 0
    ? Math.round((freshCount / nonDeletedTotal) * 10000) / 100
    : 0;

  // Reuse rate
  const reuseRate = nonDeletedTotal > 0
    ? Math.round((reusableCount / nonDeletedTotal) * 10000) / 100
    : 0;

  // 2. Pending reviews
  const reviewResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ pending: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS pending
       FROM "${schema}".evidence_reviews
       WHERE outcome IS NULL AND reviewed_at IS NULL`,
    ),
    { tenantId, operation: 'commandCenter:reviews' },
  );
  const pendingReviews = Number(getFirstRow(reviewResult)?.pending) || 0;

  // 3. Overdue requests
  const overdueResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ overdue: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS overdue
       FROM "${schema}".evidence_requests
       WHERE (status = 'overdue' OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW()))
         AND status NOT IN ('completed', 'cancelled', 'fulfilled')`,
    ),
    { tenantId, operation: 'commandCenter:overdue' },
  );
  const overdueRequests = Number(getFirstRow(overdueResult)?.overdue) || 0;

  // 4. Average quality score
  const qualityResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ avg_score: 0 }]),
    safeQuery(
      `SELECT COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".evidence_quality_assessments`,
    ),
    { tenantId, operation: 'commandCenter:quality' },
  );
  const avgQualityScore = Number(getFirstRow(qualityResult)?.avg_score) || 0;

  // 5. Status breakdown
  const statusResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         COALESCE(status, 'unknown') AS status,
         COUNT(*)::int AS count
       FROM "${schema}".evidence
       WHERE status != 'deleted'
       GROUP BY COALESCE(status, 'unknown')
       ORDER BY count DESC`,
    ),
    { tenantId, operation: 'commandCenter:statusBreakdown' },
  );

  const statusBreakdown = statusResult.rows.map((r: GenericRow) => ({
    status: String(r.status),
    count: Number(r.count) || 0,
  }));

  // 6. Source breakdown
  const sourceResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         COALESCE(NULLIF(TRIM(source_type), ''), COALESCE(NULLIF(TRIM(source_system_name), ''), 'manual_upload')) AS source_type,
         COUNT(*)::int AS count
       FROM "${schema}".evidence
       WHERE status != 'deleted'
       GROUP BY COALESCE(NULLIF(TRIM(source_type), ''), COALESCE(NULLIF(TRIM(source_system_name), ''), 'manual_upload'))
       ORDER BY count DESC`,
    ),
    { tenantId, operation: 'commandCenter:sourceBreakdown' },
  );

  const sourceBreakdown = sourceResult.rows.map((r: GenericRow) => ({
    sourceType: String(r.source_type || 'manual_upload'),
    count: Number(r.count) || 0,
  }));

  // 7. Quality tier distribution
  const tierResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         COALESCE(quality_tier, 'C') AS tier,
         COUNT(*)::int AS count
       FROM "${schema}".evidence_quality_assessments
       GROUP BY COALESCE(quality_tier, 'C')
       ORDER BY tier`,
    ),
    { tenantId, operation: 'commandCenter:qualityDistribution' },
  );

  const qualityDistribution = tierResult.rows.map((r: GenericRow) => ({
    tier: String(r.tier),
    count: Number(r.count) || 0,
  }));

  return {
    totalEvidence,
    activeEvidence,
    expiringSoon,
    expired,
    pendingReviews,
    overdueRequests,
    avgQualityScore,
    automatedCollectionRate,
    freshnessRate,
    reuseRate,
    statusBreakdown,
    sourceBreakdown,
    qualityDistribution,
  };
}

/**
 * Compute categorized work items for a specific user's "My Evidence Work" page.
 * Returns evidence requests assigned to the user, reviews pending their action,
 * expiring evidence they own, rejected items needing rework, draft packages,
 * and failed collection jobs.
 */
export async function computeWorkQueueItems(
  tenantId: string,
  userId: string,
): Promise<WorkQueueResult> {
  const schema = tenantSchema(tenantId);

  // 1. Requests assigned to this user
  const requestsResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         id, request_code, status, priority, due_date, created_at,
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN true ELSE false END AS is_overdue
       FROM "${schema}".evidence_requests
       WHERE requested_from_user_id = $1
         AND status IN ('open', 'pending', 'overdue')
       ORDER BY
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN 0 ELSE 1 END,
         due_date ASC NULLS LAST
       LIMIT 50`,
      [userId],
    ),
    { tenantId, operation: 'workQueue:requests' },
  );

  // 2. Reviews pending this user's action
  const reviewsResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         er.review_id, er.evidence_id, e.title AS evidence_title,
         e.evidence_type, er.created_at,
         EXTRACT(EPOCH FROM (NOW() - er.created_at)) / 86400 AS wait_days
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.reviewer_id = $1
         AND er.outcome IS NULL
         AND er.reviewed_at IS NULL
       ORDER BY er.created_at ASC
       LIMIT 50`,
      [userId],
    ),
    { tenantId, operation: 'workQueue:reviews' },
  );

  // 3. Expiring items owned by this user (within 30 days)
  const expiringResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         evidence_id, title, valid_to, status, evidence_type,
         EXTRACT(EPOCH FROM (valid_to - NOW())) / 86400 AS days_until_expiry
       FROM "${schema}".evidence
       WHERE owner_user_id = $1
         AND valid_to IS NOT NULL
         AND valid_to >= NOW()
         AND valid_to < NOW() + INTERVAL '30 days'
         AND status NOT IN ('deleted', 'archived', 'expired')
       ORDER BY valid_to ASC
       LIMIT 50`,
      [userId],
    ),
    { tenantId, operation: 'workQueue:expiring' },
  );

  // 4. Rejected evidence needing rework (submitted by this user)
  const rejectedResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT DISTINCT ON (e.evidence_id)
         e.evidence_id, e.title, e.status, e.evidence_type,
         er.reviewed_at, er.notes AS rejection_notes
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.outcome = 'rejected'
         AND e.submitted_by = $1
         AND e.status NOT IN ('approved', 'active', 'deleted', 'archived')
       ORDER BY e.evidence_id, er.reviewed_at DESC NULLS LAST
       LIMIT 50`,
      [userId],
    ),
    { tenantId, operation: 'workQueue:rejected' },
  );

  // 5. Draft packages created by this user
  const packagesResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         id, package_code, name, status, item_count, created_at
       FROM "${schema}".evidence_packages
       WHERE created_by = $1
         AND status = 'draft'
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId],
    ),
    { tenantId, operation: 'workQueue:packages' },
  );

  // 6. Collection failures (failed collection runs)
  const failuresResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         id, connector_id, started_at, completed_at,
         result_status, items_failed, error_message
       FROM "${schema}".evidence_collection_runs
       WHERE result_status IN ('failed', 'error')
         AND started_at >= NOW() - INTERVAL '7 days'
       ORDER BY started_at DESC
       LIMIT 20`,
    ),
    { tenantId, operation: 'workQueue:failures' },
  );

  return {
    requestsAssigned: requestsResult.rows,
    reviewsPending: reviewsResult.rows,
    expiringItems: expiringResult.rows,
    rejectedNeedingRework: rejectedResult.rows,
    packageRequests: packagesResult.rows,
    collectionFailures: failuresResult.rows,
  };
}

/**
 * Invalidate cached dashboard data. If a specific cacheKey is provided,
 * only that key is removed; otherwise all cached entries for the tenant
 * are deleted.
 */
export async function invalidateCache(
  tenantId: string,
  cacheKey?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  if (cacheKey) {
    await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `DELETE FROM "${schema}".evidence_dashboard_cache WHERE cache_key = $1`,
        [cacheKey],
      ),
      { tenantId, operation: 'invalidateCache:key' },
    );
    logger.info(`[EvidenceDashboard] Invalidated cache key "${cacheKey}" for tenant ${tenantId}`);
  } else {
    await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `DELETE FROM "${schema}".evidence_dashboard_cache`,
      ),
      { tenantId, operation: 'invalidateCache:all' },
    );
    logger.info(`[EvidenceDashboard] Invalidated all cache entries for tenant ${tenantId}`);
  }

  eventBus.publish('evidence.cache_invalidated', tenantId, { cacheKey: cacheKey || '*' });
}

/**
 * Generic cache-through helper. Checks the evidence_dashboard_cache table
 * for a valid (non-expired) cached entry. If found, returns the cached
 * payload. Otherwise, calls computeFn, stores the result, and returns it.
 *
 * @param tenantId  - Tenant identifier
 * @param cacheKey  - Unique key for this cached computation
 * @param computeFn - Async function that produces the data to cache
 * @param ttlSeconds - Time-to-live in seconds (default 300 = 5 minutes)
 */
export async function getCachedOrCompute<T>(
  tenantId: string,
  cacheKey: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_CACHE_TTL,
): Promise<T> {
  const schema = tenantSchema(tenantId);

  // 1. Check cache for a valid entry
  const cacheResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT payload, computed_at, ttl_seconds
       FROM "${schema}".evidence_dashboard_cache
       WHERE cache_key = $1
         AND computed_at + (ttl_seconds || ' seconds')::interval > NOW()
       LIMIT 1`,
      [cacheKey],
    ),
    { tenantId, operation: 'getCachedOrCompute:read' },
  );

  const cached = getFirstRow(cacheResult)!;
  if (cached?.payload) {
    logger.debug(`[EvidenceDashboard] Cache hit for "${cacheKey}" (tenant ${tenantId})`);
    return cached.payload as T;
  }

  // 2. Cache miss — compute fresh data
  logger.debug(`[EvidenceDashboard] Cache miss for "${cacheKey}" (tenant ${tenantId}), computing...`);
  const data = await computeFn();

  // 3. Store in cache (upsert)
  await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `INSERT INTO "${schema}".evidence_dashboard_cache (cache_key, payload, computed_at, ttl_seconds)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (cache_key) DO UPDATE
         SET payload = EXCLUDED.payload,
             computed_at = NOW(),
             ttl_seconds = EXCLUDED.ttl_seconds`,
      [cacheKey, JSON.stringify(data), ttlSeconds],
    ),
    { tenantId, operation: 'getCachedOrCompute:write' },
  );

  return data;
}

// ── Additional Dashboard Queries ──

/**
 * Source health: connector run summary grouped by connector.
 */
export async function getSourceHealth(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       connector_id,
       MAX(completed_at) AS last_run_at,
       COUNT(*)::int AS total_runs,
       SUM(items_collected)::int AS total_collected,
       COUNT(*) FILTER (WHERE result_status = 'failed')::int AS failure_count,
       (SELECT result_status FROM "${schema}".evidence_collection_runs r2
        WHERE r2.connector_id = cr.connector_id ORDER BY r2.started_at DESC LIMIT 1) AS latest_status
     FROM "${schema}".evidence_collection_runs cr
     GROUP BY connector_id
     ORDER BY last_run_at DESC`,
    []
  ), { tenantId, operation: 'sourceHealth' });
  return result.rows;
}

/**
 * Recent evidence activity from activity_stream or evidence table.
 */
export async function getRecentActivity(tenantId: string, limit: number = 20): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  // Try activity_stream first
  const actResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT id, user_id, module, action, entity_type, entity_id, summary, created_at
     FROM "${schema}".activity_stream
     WHERE module = 'evidence'
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  ), { tenantId, operation: 'recentActivity:stream' });
  if (actResult.rows.length > 0) return actResult.rows;

  // Fallback: derive from evidence table
  const evResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT evidence_id AS entity_id, title, status AS action, 'evidence' AS entity_type,
            submitted_by AS user_id, created_at
     FROM "${schema}".evidence
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  ), { tenantId, operation: 'recentActivity:fallback' });
  return evResult.rows;
}

/**
 * Evidence breakdown by status.
 */
export async function getEvidenceByStatus(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count
     FROM "${schema}".evidence WHERE deleted_at IS NULL
     GROUP BY status ORDER BY count DESC`,
    []
  ), { tenantId, operation: 'byStatus' });
  return result.rows;
}

/**
 * Evidence breakdown by source system.
 */
export async function getEvidenceBySource(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COALESCE(NULLIF(source_system_name, ''), 'manual') AS source, COUNT(*)::int AS count
     FROM "${schema}".evidence WHERE deleted_at IS NULL
     GROUP BY source ORDER BY count DESC`,
    []
  ), { tenantId, operation: 'bySource' });
  return result.rows;
}
