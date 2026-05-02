// ============================================================================
// Shahin -- Evidence Reporting Service
// Provides enterprise-grade reporting for evidence module dashboards and
// exports. All reports return structured JSON suitable for rendering in
// the frontend evidence analytics views.
//
// Reports: aging, backlog, source coverage, freshness, quality, reuse.
// ============================================================================

import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { logger as _logger } from '../../ports/logger.port';

// ── Types ──

export interface AgingBucket {
  band: string;
  count: number;
  percentage: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  totalEvidence: number;
  averageAgeDays: number;
  oldestDate: string | null;
}

export interface BacklogReport {
  openRequests: number;
  overdueRequests: number;
  pendingReviews: number;
  rejectedPendingRework: number;
  expiringWithin30d: number;
  top10OldestOpenRequests: GenericRow[];
}

export interface SourceCoverageEntry {
  sourceType: string;
  count: number;
  percentageOfTotal: number;
  avgQualityScore: number;
}

export interface SourceCoverageReport {
  sources: SourceCoverageEntry[];
  totalEvidence: number;
}

export interface FreshnessBand {
  band: string;
  count: number;
  percentage: number;
}

export interface FrameworkFreshness {
  frameworkCode: string;
  fresh: number;
  aging: number;
  stale: number;
  expired: number;
}

export interface FreshnessReport {
  bands: FreshnessBand[];
  totalEvidence: number;
  frameworkBreakdown: FrameworkFreshness[];
}

export interface QualityReport {
  distribution: { tier: string; count: number; percentage: number }[];
  averageCompositeScore: number;
  trend: { month: string; avgScore: number; assessmentCount: number }[];
  dimensionAverages: Record<string, number>;
  totalAssessments: number;
}

export interface ReuseReport {
  totalReusable: number;
  actuallyReused: number;
  reuseRatePercent: number;
  top10MostReused: { evidenceId: string; title: string; linkCount: number }[];
  orphanCount: number;
}

// ── Aging Band Definitions ──

const AGING_BANDS = [
  { label: '0-30d', minDays: 0, maxDays: 30 },
  { label: '31-60d', minDays: 31, maxDays: 60 },
  { label: '61-90d', minDays: 61, maxDays: 90 },
  { label: '91-180d', minDays: 91, maxDays: 180 },
  { label: '181-365d', minDays: 181, maxDays: 365 },
  { label: '365d+', minDays: 366, maxDays: null },
];

// ── Public API ──

/**
 * Generate an aging report for evidence items, grouped into age buckets.
 * Supports optional filtering by framework code or control ID.
 */
export async function generateAgingReport(
  tenantId: string,
  params?: { frameworkCode?: string; controlId?: string },
): Promise<AgingReport> {
  const schema = tenantSchema(tenantId);

  // Build optional WHERE conditions
  const conditions: string[] = [`status != 'deleted'`];
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  if (params?.frameworkCode) {
    conditions.push(`framework_code = $${paramIdx}`);
    queryParams.push(params.frameworkCode);
    paramIdx++;
  }

  if (params?.controlId) {
    conditions.push(`control_id = $${paramIdx}`);
    queryParams.push(params.controlId);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const result = await safeQuery(
    `SELECT
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 0 AND 30
       )::int AS band_0_30,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 31 AND 60
       )::int AS band_31_60,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 61 AND 90
       )::int AS band_61_90,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 91 AND 180
       )::int AS band_91_180,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 BETWEEN 181 AND 365
       )::int AS band_181_365,
       COUNT(*) FILTER (
         WHERE EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 > 365
       )::int AS band_365_plus,
       COUNT(*)::int AS total,
       COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0) AS avg_age_days,
       MIN(created_at) AS oldest_date
     FROM "${schema}".evidence
     WHERE ${whereClause}`,
    queryParams,
  );

  const row = getFirstRow(result) || {};
  const total = Number(row.total) || 0;

  const bandCounts = [
    Number(row.band_0_30) || 0,
    Number(row.band_31_60) || 0,
    Number(row.band_61_90) || 0,
    Number(row.band_91_180) || 0,
    Number(row.band_181_365) || 0,
    Number(row.band_365_plus) || 0,
  ];

  const buckets: AgingBucket[] = AGING_BANDS.map((b, i) => ({
    band: b.label,
    count: bandCounts[i],
    percentage: total > 0 ? Math.round((bandCounts[i] / total) * 10000) / 100 : 0,
  }));

  return {
    buckets,
    totalEvidence: total,
    averageAgeDays: Math.round(Number(row.avg_age_days) || 0),
    oldestDate: row.oldest_date ? new Date(row.oldest_date).toISOString() : null,
  };
}

/**
 * Generate a backlog report showing outstanding evidence work items:
 * open requests, overdue requests, pending reviews, rejected items
 * pending rework, and evidence expiring within 30 days.
 * Includes the 10 oldest open requests for prioritization.
 */
export async function generateBacklogReport(
  tenantId: string,
): Promise<BacklogReport> {
  const schema = tenantSchema(tenantId);

  // Open and overdue requests
  const requestResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ open_count: 0, overdue_count: 0 }]),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('open', 'pending'))::int AS open_count,
         COUNT(*) FILTER (
           WHERE status = 'overdue'
             OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW())
         )::int AS overdue_count
       FROM "${schema}".evidence_requests`,
    ),
    { tenantId, operation: 'backlogReport:requests' },
  );
  const reqStats = getFirstRow(requestResult) || { open_count: 0, overdue_count: 0 };

  // Pending reviews (no outcome yet)
  const reviewResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ pending: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS pending
       FROM "${schema}".evidence_reviews
       WHERE outcome IS NULL AND reviewed_at IS NULL`,
    ),
    { tenantId, operation: 'backlogReport:reviews' },
  );

  // Rejected evidence pending rework (rejected outcome, evidence not yet resubmitted)
  const rejectedResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ rejected_count: 0 }]),
    safeQuery(
      `SELECT COUNT(DISTINCT e.evidence_id)::int AS rejected_count
       FROM "${schema}".evidence_reviews er
       JOIN "${schema}".evidence e ON e.evidence_id = er.evidence_id
       WHERE er.outcome = 'rejected'
         AND e.status NOT IN ('approved', 'active', 'deleted', 'archived')`,
    ),
    { tenantId, operation: 'backlogReport:rejected' },
  );

  // Expiring within 30 days
  const expiringResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ expiring_count: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS expiring_count
       FROM "${schema}".evidence
       WHERE valid_to IS NOT NULL
         AND valid_to >= NOW()
         AND valid_to < NOW() + INTERVAL '30 days'
         AND status NOT IN ('deleted', 'archived', 'expired')`,
    ),
    { tenantId, operation: 'backlogReport:expiring' },
  );

  // Top 10 oldest open requests
  const oldestResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         id,
         request_code,
         status,
         priority,
         due_date,
         requested_from_user_id,
         created_at,
         EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age_days
       FROM "${schema}".evidence_requests
       WHERE status IN ('open', 'pending', 'overdue')
       ORDER BY created_at ASC
       LIMIT 10`,
    ),
    { tenantId, operation: 'backlogReport:oldest' },
  );

  return {
    openRequests: Number(reqStats.open_count) || 0,
    overdueRequests: Number(reqStats.overdue_count) || 0,
    pendingReviews: Number(getFirstRow(reviewResult)?.pending) || 0,
    rejectedPendingRework: Number(getFirstRow(rejectedResult)?.rejected_count) || 0,
    expiringWithin30d: Number(getFirstRow(expiringResult)?.expiring_count) || 0,
    top10OldestOpenRequests: oldestResult.rows,
  };
}

/**
 * Generate a source coverage report showing evidence distribution by source_type,
 * count per source, percentage of total, and average quality score per source.
 */
export async function generateSourceCoverageReport(
  tenantId: string,
): Promise<SourceCoverageReport> {
  const schema = tenantSchema(tenantId);

  // Total evidence count
  const totalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total
     FROM "${schema}".evidence
     WHERE status != 'deleted'`,
  );
  const totalEvidence = Number(getFirstRow(totalResult)?.total) || 0;

  // Per-source breakdown with average quality score
  const sourceResult = await safeQuery(
    `SELECT
       COALESCE(NULLIF(TRIM(e.source_type), ''), COALESCE(NULLIF(TRIM(e.source_system_name), ''), 'manual_upload')) AS source_type,
       COUNT(*)::int AS count,
       COALESCE(AVG(qa.quality_score), 0)::numeric(5,2) AS avg_quality_score
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_quality_assessments qa ON qa.evidence_id = e.evidence_id
     WHERE e.status != 'deleted'
     GROUP BY COALESCE(NULLIF(TRIM(e.source_type), ''), COALESCE(NULLIF(TRIM(e.source_system_name), ''), 'manual_upload'))
     ORDER BY count DESC`,
  );

  const sources: SourceCoverageEntry[] = sourceResult.rows.map((r: GenericRow) => ({
    sourceType: String(r.source_type || 'manual_upload'),
    count: Number(r.count) || 0,
    percentageOfTotal: totalEvidence > 0
      ? Math.round((Number(r.count) / totalEvidence) * 10000) / 100
      : 0,
    avgQualityScore: Number(r.avg_quality_score) || 0,
  }));

  return {
    sources,
    totalEvidence,
  };
}

/**
 * Generate a freshness report grouping evidence into freshness bands
 * (fresh, aging, stale, expired). Includes per-framework freshness breakdown.
 */
export async function generateFreshnessReport(
  tenantId: string,
): Promise<FreshnessReport> {
  const schema = tenantSchema(tenantId);

  // Overall freshness band distribution
  // Uses freshness_status column (set by freshness service) with fallback to date logic
  const bandResult = await safeQuery(
    `SELECT
       COUNT(*) FILTER (
         WHERE freshness_status = 'current'
           OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
       )::int AS fresh,
       COUNT(*) FILTER (
         WHERE freshness_status = 'aging'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL
               AND valid_to > NOW() + INTERVAL '30 days'
               AND valid_to <= NOW() + INTERVAL '90 days')
       )::int AS aging,
       COUNT(*) FILTER (
         WHERE freshness_status = 'stale'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL
               AND valid_to > NOW()
               AND valid_to <= NOW() + INTERVAL '30 days')
       )::int AS stale,
       COUNT(*) FILTER (
         WHERE freshness_status = 'expired'
           OR status = 'expired'
           OR (freshness_status IS NULL AND valid_to IS NOT NULL AND valid_to <= NOW())
       )::int AS expired,
       COUNT(*)::int AS total
     FROM "${schema}".evidence
     WHERE status NOT IN ('deleted', 'archived')`,
  );

  const row = getFirstRow(bandResult) || {};
  const total = Number(row.total) || 0;

  const bandCounts: Record<string, number> = {
    fresh: Number(row.fresh) || 0,
    aging: Number(row.aging) || 0,
    stale: Number(row.stale) || 0,
    expired: Number(row.expired) || 0,
  };

  const bands: FreshnessBand[] = Object.entries(bandCounts).map(([band, count]) => ({
    band,
    count,
    percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
  }));

  // Per-framework freshness breakdown
  const frameworkResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         COALESCE(framework_code, 'unlinked') AS framework_code,
         COUNT(*) FILTER (
           WHERE freshness_status = 'current'
             OR (freshness_status IS NULL AND (valid_to IS NULL OR valid_to > NOW() + INTERVAL '90 days'))
         )::int AS fresh,
         COUNT(*) FILTER (
           WHERE freshness_status = 'aging'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL
                 AND valid_to > NOW() + INTERVAL '30 days'
                 AND valid_to <= NOW() + INTERVAL '90 days')
         )::int AS aging,
         COUNT(*) FILTER (
           WHERE freshness_status = 'stale'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL
                 AND valid_to > NOW()
                 AND valid_to <= NOW() + INTERVAL '30 days')
         )::int AS stale,
         COUNT(*) FILTER (
           WHERE freshness_status = 'expired'
             OR status = 'expired'
             OR (freshness_status IS NULL AND valid_to IS NOT NULL AND valid_to <= NOW())
         )::int AS expired
       FROM "${schema}".evidence
       WHERE status NOT IN ('deleted', 'archived')
       GROUP BY COALESCE(framework_code, 'unlinked')
       ORDER BY framework_code`,
    ),
    { tenantId, operation: 'freshnessReport:framework' },
  );

  const frameworkBreakdown: FrameworkFreshness[] = frameworkResult.rows.map((r: GenericRow) => ({
    frameworkCode: String(r.framework_code),
    fresh: Number(r.fresh) || 0,
    aging: Number(r.aging) || 0,
    stale: Number(r.stale) || 0,
    expired: Number(r.expired) || 0,
  }));

  return {
    bands,
    totalEvidence: total,
    frameworkBreakdown,
  };
}

/**
 * Generate a quality report showing quality tier distribution (A/B/C),
 * average composite score, trend over the last 6 months, and per-dimension
 * score averages from evidence_quality_assessments.
 */
export async function generateQualityReport(
  tenantId: string,
): Promise<QualityReport> {
  const schema = tenantSchema(tenantId);

  // Quality tier distribution
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
    { tenantId, operation: 'qualityReport:tiers' },
  );

  const totalAssessments = tierResult.rows.reduce(
    (sum: number, r: GenericRow) => sum + (Number(r.count) || 0),
    0,
  );

  const distribution = tierResult.rows.map((r: GenericRow) => ({
    tier: String(r.tier),
    count: Number(r.count) || 0,
    percentage: totalAssessments > 0
      ? Math.round(((Number(r.count) || 0) / totalAssessments) * 10000) / 100
      : 0,
  }));

  // Average composite score
  const avgResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ avg_score: 0 }]),
    safeQuery(
      `SELECT COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".evidence_quality_assessments`,
    ),
    { tenantId, operation: 'qualityReport:avgScore' },
  );
  const averageCompositeScore = Number(getFirstRow(avgResult)?.avg_score) || 0;

  // Trend over last 6 months (monthly averages)
  const trendResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         TO_CHAR(assessed_at, 'YYYY-MM') AS month,
         COALESCE(AVG(COALESCE(composite_score, quality_score)), 0)::numeric(5,2) AS avg_score,
         COUNT(*)::int AS assessment_count
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(assessed_at, 'YYYY-MM')
       ORDER BY month ASC`,
    ),
    { tenantId, operation: 'qualityReport:trend' },
  );

  const trend = trendResult.rows.map((r: GenericRow) => ({
    month: String(r.month),
    avgScore: Number(r.avg_score) || 0,
    assessmentCount: Number(r.assessment_count) || 0,
  }));

  // Dimension breakdown averages (from the dimension_scores JSONB or individual columns)
  // The 717 migration stores dimension_scores as JSONB; the 716 migration has individual columns
  const dimensionAverages: Record<string, number> = {};

  // Try JSONB approach first (717 schema)
  const dimResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         COALESCE(AVG((dimension_scores->>'freshness')::numeric), 0)::numeric(5,2) AS freshness,
         COALESCE(AVG((dimension_scores->>'completeness')::numeric), 0)::numeric(5,2) AS completeness,
         COALESCE(AVG((dimension_scores->>'sourceReliability')::numeric), 0)::numeric(5,2) AS source_reliability,
         COALESCE(AVG((dimension_scores->>'reviewerSignOff')::numeric), 0)::numeric(5,2) AS reviewer_signoff,
         COALESCE(AVG((dimension_scores->>'formatMatch')::numeric), 0)::numeric(5,2) AS format_match
       FROM "${schema}".evidence_quality_assessments
       WHERE dimension_scores IS NOT NULL AND dimension_scores != '{}'::jsonb`,
    ),
    { tenantId, operation: 'qualityReport:dimensions' },
  );

  const dimRow = getFirstRow(dimResult)!;
  if (dimRow) {
    dimensionAverages.freshness = Number(dimRow.freshness) || 0;
    dimensionAverages.completeness = Number(dimRow.completeness) || 0;
    dimensionAverages.sourceReliability = Number(dimRow.source_reliability) || 0;
    dimensionAverages.reviewerSignOff = Number(dimRow.reviewer_signoff) || 0;
    dimensionAverages.formatMatch = Number(dimRow.format_match) || 0;
  }

  // Fallback: try individual columns (716 schema)
  if (Object.values(dimensionAverages).every((v) => v === 0)) {
    const colResult = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `SELECT
           COALESCE(AVG(CASE WHEN completeness_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS completeness,
           COALESCE(AVG(CASE WHEN scope_match_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS scope_match,
           COALESCE(AVG(CASE WHEN authenticity_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS authenticity,
           COALESCE(AVG(CASE WHEN readability_result NOT IN ('not_assessed','') THEN quality_score ELSE NULL END), 0)::numeric(5,2) AS readability
         FROM "${schema}".evidence_quality_assessments`,
      ),
      { tenantId, operation: 'qualityReport:dimensionsFallback' },
    );

    const colRow = getFirstRow(colResult)!;
    if (colRow) {
      dimensionAverages.completeness = Number(colRow.completeness) || 0;
      dimensionAverages.scopeMatch = Number(colRow.scope_match) || 0;
      dimensionAverages.authenticity = Number(colRow.authenticity) || 0;
      dimensionAverages.readability = Number(colRow.readability) || 0;
    }
  }

  return {
    distribution,
    averageCompositeScore,
    trend,
    dimensionAverages,
    totalAssessments,
  };
}

/**
 * Generate a reuse report showing evidence reuse statistics:
 * total reusable items, actually reused (linked to multiple entities),
 * reuse rate percentage, top 10 most-reused items, and orphan count.
 */
export async function generateReuseReport(
  tenantId: string,
): Promise<ReuseReport> {
  const schema = tenantSchema(tenantId);

  // Total reusable evidence
  const reusableResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ total_reusable: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS total_reusable
       FROM "${schema}".evidence
       WHERE reusable_flag = true
         AND status NOT IN ('deleted', 'archived', 'expired')`,
    ),
    { tenantId, operation: 'reuseReport:reusable' },
  );
  const totalReusable = Number(getFirstRow(reusableResult)?.total_reusable) || 0;

  // Actually reused (evidence linked to 2+ entities via evidence_links)
  const reusedResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ actually_reused: 0 }]),
    safeQuery(
      `SELECT COUNT(DISTINCT el.evidence_id)::int AS actually_reused
       FROM "${schema}".evidence_links el
       JOIN "${schema}".evidence e ON e.evidence_id = el.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
       GROUP BY el.evidence_id
       HAVING COUNT(*) >= 2`,
    ),
    { tenantId, operation: 'reuseReport:actuallyReused' },
  );
  // The above returns rows (one per evidence_id with 2+ links), count them
  const actuallyReused = reusedResult.rows.length;

  // Compute reuse rate
  const reuseRatePercent = totalReusable > 0
    ? Math.round((actuallyReused / totalReusable) * 10000) / 100
    : 0;

  // Top 10 most reused evidence items (by link count)
  const topResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT
         e.evidence_id,
         e.title,
         COUNT(el.id)::int AS link_count
       FROM "${schema}".evidence e
       JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
       GROUP BY e.evidence_id, e.title
       ORDER BY link_count DESC
       LIMIT 10`,
    ),
    { tenantId, operation: 'reuseReport:top10' },
  );

  const top10MostReused = topResult.rows.map((r: GenericRow) => ({
    evidenceId: String(r.evidence_id),
    title: String(r.title || ''),
    linkCount: Number(r.link_count) || 0,
  }));

  // Orphan count (evidence with no links and no control_id)
  const orphanResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ orphan_count: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS orphan_count
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
       WHERE e.status NOT IN ('deleted', 'archived', 'expired')
         AND e.control_id IS NULL
         AND el.evidence_id IS NULL`,
    ),
    { tenantId, operation: 'reuseReport:orphans' },
  );
  const orphanCount = Number(getFirstRow(orphanResult)?.orphan_count) || 0;

  return {
    totalReusable,
    actuallyReused,
    reuseRatePercent,
    top10MostReused,
    orphanCount,
  };
}

// ============================================================================
// Dedicated Overdue Requests Report
// ============================================================================

export async function generateOverdueRequestsReport(tenantId: string): Promise<{
  totalOverdue: number;
  byPriority: { priority: string; count: number }[];
  byAssignee: { userId: string; count: number }[];
  avgOverdueDays: number;
  items: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const overdueResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT id, request_code, requested_from_user_id, priority, due_date, status, created_at,
            EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400 AS overdue_days
     FROM "${schema}".evidence_requests
     WHERE (status = 'overdue' OR (status IN ('open', 'pending') AND due_date IS NOT NULL AND due_date < NOW()))
     ORDER BY due_date ASC
     LIMIT 200`,
  ), { tenantId, operation: 'overdueReport:items' });

  const items = overdueResult.rows;
  const totalOverdue = items.length;

  // Aggregate by priority
  const priorityMap = new Map<string, number>();
  const assigneeMap = new Map<string, number>();
  let totalOverdueDays = 0;

  for (const row of items) {
    const p = String(row.priority || 'medium');
    priorityMap.set(p, (priorityMap.get(p) || 0) + 1);
    const a = String(row.requested_from_user_id || 'unassigned');
    assigneeMap.set(a, (assigneeMap.get(a) || 0) + 1);
    totalOverdueDays += Math.max(0, Number(row.overdue_days) || 0);
  }

  return {
    totalOverdue,
    byPriority: [...priorityMap.entries()].map(([priority, count]) => ({ priority, count })),
    byAssignee: [...assigneeMap.entries()].map(([userId, count]) => ({ userId, count })),
    avgOverdueDays: totalOverdue > 0 ? Math.round(totalOverdueDays / totalOverdue * 10) / 10 : 0,
    items,
  };
}

// ============================================================================
// Dedicated Review Backlog Report
// ============================================================================

export async function generateReviewBacklogReport(tenantId: string): Promise<{
  totalPending: number;
  byReviewer: { reviewerId: string; count: number }[];
  avgWaitDays: number;
  oldestPendingDate: string | null;
  items: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const pendingResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT e.evidence_id, e.title, e.status, e.submitted_by, e.created_at,
            EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 86400 AS wait_days
     FROM "${schema}".evidence e
     WHERE e.status IN ('submitted', 'validating', 'under_review')
       AND e.deleted_at IS NULL
     ORDER BY e.created_at ASC
     LIMIT 200`,
  ), { tenantId, operation: 'reviewBacklog:items' });

  const items = pendingResult.rows;
  const totalPending = items.length;

  // Get reviewer assignment from evidence_reviews (pending reviews with no outcome)
  const reviewerResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT reviewer_id, COUNT(*)::int AS count
     FROM "${schema}".evidence_reviews
     WHERE outcome IS NULL AND reviewed_at IS NULL AND deleted_at IS NULL
     GROUP BY reviewer_id
     ORDER BY count DESC`,
  ), { tenantId, operation: 'reviewBacklog:byReviewer' });

  let totalWaitDays = 0;
  let oldestDate: string | null = null;
  for (const row of items) {
    totalWaitDays += Math.max(0, Number(row.wait_days) || 0);
    if (!oldestDate || String(row.created_at) < oldestDate) {
      oldestDate = String(row.created_at);
    }
  }

  return {
    totalPending,
    byReviewer: reviewerResult.rows.map((r: GenericRow) => ({
      reviewerId: String(r.reviewer_id),
      count: Number(r.count) || 0,
    })),
    avgWaitDays: totalPending > 0 ? Math.round(totalWaitDays / totalPending * 10) / 10 : 0,
    oldestPendingDate: oldestDate,
    items,
  };
}

// ============================================================================
// Stale Evidence Report
// ============================================================================

export async function generateStaleEvidenceReport(tenantId: string): Promise<{
  totalStale: number;
  byFramework: { frameworkCode: string; count: number }[];
  byOwner: { userId: string; count: number }[];
  items: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const staleResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT evidence_id, title, evidence_type, control_id, framework_code,
            owner_user_id, freshness_status, valid_to, created_at, updated_at
     FROM "${schema}".evidence
     WHERE (freshness_status IN ('stale', 'expired') OR (valid_to IS NOT NULL AND valid_to < NOW()))
       AND status NOT IN ('deleted', 'archived', 'disposed')
       AND deleted_at IS NULL
     ORDER BY valid_to ASC NULLS LAST
     LIMIT 200`,
  ), { tenantId, operation: 'staleReport:items' });

  const items = staleResult.rows;

  const fwMap = new Map<string, number>();
  const ownerMap = new Map<string, number>();
  for (const row of items) {
    const fw = String(row.framework_code || 'unlinked');
    fwMap.set(fw, (fwMap.get(fw) || 0) + 1);
    const o = String(row.owner_user_id || 'unassigned');
    ownerMap.set(o, (ownerMap.get(o) || 0) + 1);
  }

  return {
    totalStale: items.length,
    byFramework: [...fwMap.entries()].map(([frameworkCode, count]) => ({ frameworkCode, count })),
    byOwner: [...ownerMap.entries()].map(([userId, count]) => ({ userId, count })),
    items,
  };
}

// ============================================================================
// Audit Pack Readiness Report
// ============================================================================

export async function generateAuditReadinessReport(tenantId: string): Promise<{
  frameworks: { frameworkCode: string; totalControls: number; controlsWithEvidence: number; coveragePercent: number; staleCount: number }[];
  overallReadiness: number;
}> {
  const schema = tenantSchema(tenantId);

  const fwResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       c.framework_code,
       COUNT(DISTINCT c.control_id)::int AS total_controls,
       COUNT(DISTINCT e.control_id)::int AS controls_with_evidence,
       COUNT(DISTINCT CASE WHEN e.freshness_status IN ('stale', 'expired') THEN e.evidence_id END)::int AS stale_count
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
       AND e.status NOT IN ('deleted', 'archived', 'disposed')
       AND e.deleted_at IS NULL
     WHERE c.framework_code IS NOT NULL
     GROUP BY c.framework_code
     ORDER BY c.framework_code`,
  ), { tenantId, operation: 'auditReadiness:frameworks' });

  const frameworks = fwResult.rows.map((r: GenericRow) => {
    const total = Number(r.total_controls) || 0;
    const withEvidence = Number(r.controls_with_evidence) || 0;
    return {
      frameworkCode: String(r.framework_code),
      totalControls: total,
      controlsWithEvidence: withEvidence,
      coveragePercent: total > 0 ? Math.round((withEvidence / total) * 100) : 0,
      staleCount: Number(r.stale_count) || 0,
    };
  });

  const totalControls = frameworks.reduce((s, f) => s + f.totalControls, 0);
  const totalCovered = frameworks.reduce((s, f) => s + f.controlsWithEvidence, 0);
  const overallReadiness = totalControls > 0 ? Math.round((totalCovered / totalControls) * 100) : 0;

  return { frameworks, overallReadiness };
}
