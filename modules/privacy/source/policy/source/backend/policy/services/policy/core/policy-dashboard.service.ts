/**
 * Policy Dashboard Service
 *
 * Provides aggregated KPIs, work queues, activity feeds, and scoring
 * for the policy management dashboard. Supports optional caching via
 * policy_dashboard_cache to reduce load on complex aggregate queries.
 */

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface OverviewKPIs {
  totalPolicies: number;
  publishedCount: number;
  draftCount: number;
  approvedCount: number;
  retiredCount: number;
  overdueReviews: number;
  pendingApprovals: number;
  acknowledgmentRate: number;
  activeExceptions: number;
  expiringExceptions: number;
  stalePolicies: number;
  policiesWithoutOwner: number;
  categoryDistribution: CategoryDistribution[];
}

export interface WorkQueue {
  myDrafts: Record<string, unknown>[];
  pendingReviews: Record<string, unknown>[];
  pendingApprovals: Record<string, unknown>[];
  pendingPublications: Record<string, unknown>[];
  ackFollowUp: Record<string, unknown>[];
  exceptionsAwaiting: Record<string, unknown>[];
}

export interface PolicyScores {
  policyId: string;
  coverageScore: number;
  freshnessScore: number;
  acknowledgmentScore: number;
  exceptionScore: number;
}

// ── Overview KPIs ────────────────────────────────────────────────────────────

/**
 * Compute overview KPIs for the policy dashboard.
 * Uses CTEs for efficient single-pass aggregation across multiple
 * policy dimensions: status distribution, overdue reviews, stale policies,
 * acknowledgment rates, exception counts, and category breakdown.
 */
export async function getOverviewKPIs(
  tenantId: string,
): Promise<OverviewKPIs> {
  const schema = tenantSchema(tenantId);

  // Status counts via a single aggregation query
  const statusRes = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_policies,
       COUNT(*) FILTER (WHERE status = 'published')::int AS published_count,
       COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
       COUNT(*) FILTER (WHERE status = 'retired')::int AS retired_count,
       COUNT(*) FILTER (
         WHERE next_review_date < NOW()
           AND status NOT IN ('retired', 'archived')
       )::int AS overdue_reviews,
       COUNT(*) FILTER (
         WHERE updated_at < NOW() - INTERVAL '12 months'
           AND status = 'published'
       )::int AS stale_policies,
       COUNT(*) FILTER (
         WHERE (owner IS NULL OR owner = '')
           AND status NOT IN ('retired', 'archived')
       )::int AS policies_without_owner
     FROM "${schema}".policies`,
    [],
  );

  const stats = getFirstRow(statusRes) ?? {};

  // Pending approvals from policy_process_actions
  const approvalsRes = await safeQuery(
    `SELECT COUNT(*)::int AS pending_approvals
     FROM "${schema}".policy_process_actions
     WHERE step_key LIKE '%approval%'
       AND status = 'pending'`,
    [],
  );
  const pendingApprovals = getFirstRow(approvalsRes)?.pending_approvals ?? 0;

  // Acknowledgment rate from attestation campaigns
  const ackRes = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE status = 'attested')::int AS attested_count
     FROM "${schema}".attestation_records`,
    [],
  );
  const ackStats = getFirstRow(ackRes) ?? { total_records: 0, attested_count: 0 };
  const acknowledgmentRate =
    (ackStats.total_records as number) > 0
      ? Math.round(((ackStats.attested_count as number) / (ackStats.total_records as number)) * 100)
      : 0;

  // Active and expiring exceptions
  const exceptionsRes = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('approved', 'renewed'))::int AS active_exceptions,
       COUNT(*) FILTER (
         WHERE status IN ('approved', 'renewed')
           AND expiry_date <= NOW() + INTERVAL '30 days'
           AND expiry_date > NOW()
       )::int AS expiring_exceptions
     FROM "${schema}".policy_exception_requests`,
    [],
  );
  const excStats = getFirstRow(exceptionsRes) ?? { active_exceptions: 0, expiring_exceptions: 0 };

  // Category distribution
  const categoryRes = await safeQuery(
    `SELECT COALESCE(category, 'Uncategorized') AS category,
            COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived')
     GROUP BY category
     ORDER BY count DESC`,
    [],
  );

  return {
    totalPolicies: (stats.total_policies as number) ?? 0,
    publishedCount: (stats.published_count as number) ?? 0,
    draftCount: (stats.draft_count as number) ?? 0,
    approvedCount: (stats.approved_count as number) ?? 0,
    retiredCount: (stats.retired_count as number) ?? 0,
    overdueReviews: (stats.overdue_reviews as number) ?? 0,
    pendingApprovals: pendingApprovals as number,
    acknowledgmentRate,
    activeExceptions: (excStats.active_exceptions as number) ?? 0,
    expiringExceptions: (excStats.expiring_exceptions as number) ?? 0,
    stalePolicies: (stats.stale_policies as number) ?? 0,
    policiesWithoutOwner: (stats.policies_without_owner as number) ?? 0,
    categoryDistribution: categoryRes.rows.map((r) => ({
      category: r.category as string,
      count: r.count as number,
    })),
  };
}

// ── Work Queue ───────────────────────────────────────────────────────────────

/**
 * Get the current user's work queue for the policy module.
 * Returns items requiring the user's attention across all policy
 * workflow stages: drafts, reviews, approvals, publications,
 * acknowledgment follow-ups, and exception requests.
 */
export async function getWorkQueue(
  tenantId: string,
  userId: string,
  offset?: number,
  limit?: number,
): Promise<WorkQueue> {
  const schema = tenantSchema(tenantId);

  // Validate pagination parameters to prevent negative offsets and unbounded queries
  const safeOffset = Math.max(0, offset || 0);
  const safeLimit = Math.min(Math.max(1, limit || 20), 100);

  // My drafts
  const draftsRes = await safeQuery(
    `SELECT policy_id, title, status, created_at, updated_at
     FROM "${schema}".policies
     WHERE author_user_id = $1 AND status = 'draft'
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  );

  // Pending reviews (internal_review, legal_review, compliance_review)
  const reviewsRes = await safeQuery(
    `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key IN ('internal_review', 'legal_review', 'compliance_review')
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  );

  // Pending approvals
  const approvalsRes = await safeQuery(
    `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key LIKE '%approval%'
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  );

  // Pending publications
  const pubsRes = await safeQuery(
    `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key = 'publish'
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  );

  // Acknowledgment follow-up — active campaigns created by this user, with completion stats
  const ackRes = await safeQuery(
    `SELECT ac.campaign_id, ac.name, ac.policy_id, ac.due_date,
            gp.title AS policy_title,
            COUNT(ar.record_id)::int AS total_records,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'pending')::int AS pending_count
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ac.policy_id
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ac.created_by = $1
       AND ac.status = 'active'
     GROUP BY ac.campaign_id, ac.name, ac.policy_id, ac.due_date, gp.title
     ORDER BY ac.due_date ASC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  );

  // Exceptions awaiting decision (pending exceptions visible to approvers)
  const exceptionsRes = await safeQuery(
    `SELECT per.exception_id, per.policy_id, per.reason, per.priority,
            per.requested_by, per.created_at,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.status = 'pending'
     ORDER BY
       CASE per.priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         ELSE 4
       END,
       per.created_at ASC
     LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset],
  );

  return {
    myDrafts: draftsRes.rows,
    pendingReviews: reviewsRes.rows,
    pendingApprovals: approvalsRes.rows,
    pendingPublications: pubsRes.rows,
    ackFollowUp: ackRes.rows,
    exceptionsAwaiting: exceptionsRes.rows,
  };
}

// ── Recent Activity ──────────────────────────────────────────────────────────

/**
 * Get recent policy activity from the workflow tracker.
 * Returns the most recent entries sorted by creation time.
 */
export async function getRecentActivity(
  tenantId: string,
  limit: number = 20,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT *
     FROM "${schema}".policy_workflow_tracker
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );

  return res.rows;
}

// ── Policy Scores ────────────────────────────────────────────────────────────

/**
 * Compute and persist policy health scores.
 * Calculates four dimensions:
 * - coverage: percentage of controls linked to this policy
 * - freshness: months since the policy was last updated
 * - acknowledgment: percentage attested from active campaigns
 * - exception: count of active exceptions against this policy
 *
 * Results are upserted into policy_scores for caching and trend analysis.
 */
export async function computePolicyScores(
  tenantId: string,
  policyId: string,
): Promise<PolicyScores> {
  const schema = tenantSchema(tenantId);

  // Coverage: percentage of total controls that are linked to this policy
  const coverageRes = await safeQuery(
    `SELECT
       (SELECT COUNT(*)::int FROM "${schema}".policy_control_links WHERE policy_id = $1) AS linked_controls,
       (SELECT COUNT(*)::int FROM "${schema}".controls) AS total_controls`,
    [policyId],
  );
  const cov = getFirstRow(coverageRes) ?? { linked_controls: 0, total_controls: 0 };
  const coverageScore =
    (cov.total_controls as number) > 0
      ? Math.round(((cov.linked_controls as number) / (cov.total_controls as number)) * 100)
      : 0;

  // Freshness: months since last update (lower = fresher; cap at 100 for recent, 0 for very stale)
  const freshnessRes = await safeQuery(
    `SELECT EXTRACT(EPOCH FROM (NOW() - updated_at)) / 2592000 AS months_since_update
     FROM "${schema}".policies
     WHERE policy_id = $1`,
    [policyId],
  );
  const freshRow = getFirstRow(freshnessRes)!;
  const monthsSinceUpdate = freshRow ? Math.round(freshRow.months_since_update as number) : 0;
  // Score: 100 if updated within 1 month, decreasing by 8 per month, minimum 0
  const freshnessScore = Math.max(0, 100 - monthsSinceUpdate * 8);

  // Acknowledgment: percentage of attestation records that are attested for this policy
  const ackRes = await safeQuery(
    `SELECT
       COUNT(ar.record_id)::int AS total_records,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count
     FROM "${schema}".attestation_campaigns ac
     JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ac.policy_id = $1 AND ac.status = 'active'`,
    [policyId],
  );
  const ackStats = getFirstRow(ackRes) ?? { total_records: 0, attested_count: 0 };
  const acknowledgmentScore =
    (ackStats.total_records as number) > 0
      ? Math.round(((ackStats.attested_count as number) / (ackStats.total_records as number)) * 100)
      : 0;

  // Exception: count of active exceptions for this policy
  const excRes = await safeQuery(
    `SELECT COUNT(*)::int AS active_exceptions
     FROM "${schema}".policy_exception_requests
     WHERE policy_id = $1 AND status IN ('approved', 'renewed')`,
    [policyId],
  );
  const exceptionScore = (getFirstRow(excRes)?.active_exceptions as number) ?? 0;

  // Upsert individual score rows into policy_scores (UNIQUE on policy_id, score_type)
  const scores: Array<[string, number]> = [
    ['coverage', coverageScore],
    ['freshness', freshnessScore],
    ['acknowledgment', acknowledgmentScore],
    ['exception', exceptionScore],
  ];
  for (const [scoreType, scoreValue] of scores) {
    await safeQuery(
      `INSERT INTO "${schema}".policy_scores (policy_id, score_type, score_value, computed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (policy_id, score_type) DO UPDATE
       SET score_value = EXCLUDED.score_value, computed_at = NOW()`,
      [policyId, scoreType, scoreValue],
    );
  }

  return {
    policyId,
    coverageScore,
    freshnessScore,
    acknowledgmentScore,
    exceptionScore,
  };
}

// ── Dashboard Cache ──────────────────────────────────────────────────────────

/**
 * Cache a dashboard result for future retrieval.
 * Uses upsert with a configurable TTL (default 15 minutes).
 */
export async function cacheResult(
  tenantId: string,
  cacheKey: string,
  data: unknown,
  ttlMinutes: number = 15,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".policy_dashboard_cache
     (cache_key, data, expires_at, computed_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'), NOW())
     ON CONFLICT (cache_key) DO UPDATE
     SET data = EXCLUDED.data,
         expires_at = EXCLUDED.expires_at,
         computed_at = NOW()`,
    [cacheKey, JSON.stringify(data), ttlMinutes],
  );
}

/**
 * Retrieve a cached dashboard result if it has not expired.
 * Returns null if the cache key does not exist or has expired.
 */
export async function getCachedResult(
  tenantId: string,
  cacheKey: string,
): Promise<unknown | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT data
     FROM "${schema}".policy_dashboard_cache
     WHERE cache_key = $1 AND expires_at > NOW()`,
    [cacheKey],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  // Parse JSON data if stored as text, or return directly if JSONB
  const raw = row.data;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
