// ============================================
// Shahin — Vendor Engagement Score Service
// Computes a 0–100 engagement score per vendor
// using four weighted components over the last
// 90 days. Stores history, publishes low-score
// events via EventBus.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { EngagementScoreBreakdown } from '@dos/types';
import { getFirstRow } from '@dos/db';

// ── Constants ──────────────────────────────────────────────────────────────

const LOOKBACK_DAYS = 90;

const MAX_RESPONSE_TIME = 30;
const MAX_COMPLETION_RATE = 25;
const MAX_EVIDENCE_TIMELINESS = 25;
const MAX_REMEDIATION_RATE = 20;

const LOW_SCORE_THRESHOLD = 40;

// ── Score Computation ──────────────────────────────────────────────────────

/**
 * Compute the engagement score for a vendor using data from the last 90 days.
 *
 * Formula:
 *   response_time       → 0-30 pts (faster avg response = higher score)
 *   completion_rate      → 0-25 pts (% of questionnaires completed on time)
 *   evidence_timeliness  → 0-25 pts (% of evidence submitted before due date)
 *   remediation_rate     → 0-20 pts (% of remediation items resolved)
 *
 * The result is stored in vendor_engagement_scores and a
 * `vendor.engagement_score_low` event is published when score < 40.
 */
export async function computeEngagementScore(
  tenantId: string,
  vendorId: string,
): Promise<EngagementScoreBreakdown> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  const cutoffISO = cutoff.toISOString();

  // ── 1. Response Time Score (0-30) ──
  // Average days to respond to questionnaires. Lower is better.
  // Max 30 pts when avg response ≤ 1 day, 0 pts when avg ≥ 30 days.
  const responseTimeResult = await safeQuery(
    `SELECT AVG(
       EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - distributed_at)) / 86400
     ) AS avg_days
     FROM ${schema}.questionnaires
     WHERE vendor_id = $1
       AND distributed_at IS NOT NULL
       AND distributed_at >= $2`,
    [vendorId, cutoffISO],
  );
  const avgResponseDays: number | null = getFirstRow(responseTimeResult)?.avg_days ?? null;
  const responseTimeScore = computeResponseTimeScore(avgResponseDays);

  // ── 2. Completion Rate Score (0-25) ──
  // % of distributed questionnaires completed (status = 'completed').
  const completionResult = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) AS total
     FROM ${schema}.questionnaires
     WHERE vendor_id = $1
       AND distributed_at IS NOT NULL
       AND distributed_at >= $2`,
    [vendorId, cutoffISO],
  );
  const completed = Number(getFirstRow(completionResult)?.completed ?? 0);
  const totalQ = Number(getFirstRow(completionResult)?.total ?? 0);
  const completionRateScore = computeCompletionRateScore(completed, totalQ);

  // ── 3. Evidence Timeliness Score (0-25) ──
  // % of evidence items submitted on or before their due date.
  let onTimeEvidence = 0;
  let totalEvidence = 0;
  try {
    const evidenceResult = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE submitted_at IS NOT NULL AND submitted_at <= due_date) AS on_time,
         COUNT(*) AS total
       FROM ${schema}.evidence
       WHERE vendor_id = $1
         AND created_at >= $2`,
      [vendorId, cutoffISO],
    );
    onTimeEvidence = Number(getFirstRow(evidenceResult)?.on_time ?? 0);
    totalEvidence = Number(getFirstRow(evidenceResult)?.total ?? 0);
  } catch { /* evidence table may not have vendor_id */ }
  const evidenceTimelinessScore = computeEvidenceTimelinessScore(onTimeEvidence, totalEvidence);

  // ── 4. Remediation Rate Score (0-20) ──
  // % of remediation / action items resolved.
  let resolvedItems = 0;
  let totalItems = 0;
  try {
    const remediationResult = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'completed') AS resolved,
         COUNT(*) AS total
       FROM ${schema}.action_items
       WHERE vendor_id = $1
         AND created_at >= $2`,
      [vendorId, cutoffISO],
    );
    resolvedItems = Number(getFirstRow(remediationResult)?.resolved ?? 0);
    totalItems = Number(getFirstRow(remediationResult)?.total ?? 0);
  } catch { /* action_items table may not have vendor_id */ }
  const remediationRateScore = computeRemediationRateScore(resolvedItems, totalItems);

  // ── Total ──
  const totalScore =
    responseTimeScore + completionRateScore + evidenceTimelinessScore + remediationRateScore;

  const now = new Date().toISOString();

  const breakdown: EngagementScoreBreakdown = {
    vendorId,
    responseTimeScore,
    completionRateScore,
    evidenceTimelinessScore,
    remediationRateScore,
    totalScore,
    computedAt: now,
  };

  // ── Persist to vendor_engagement_scores ──
  await safeQuery(
    `INSERT INTO ${schema}.vendor_engagement_scores
       (vendor_id, total_score, response_time_score, completion_rate_score,
        evidence_timeliness_score, remediation_rate_score, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      vendorId,
      totalScore,
      responseTimeScore,
      completionRateScore,
      evidenceTimelinessScore,
      remediationRateScore,
      now,
    ],
  );

  // ── Publish low-score event when score < 40 ──
  if (totalScore < LOW_SCORE_THRESHOLD) {
    await eventBus.publish({
      eventType: 'vendor.engagement_score_low' as any,
      tenantId,

      sourceService: 'engagement-score',
      entityType: 'vendor',
      entityId: vendorId,
      severity: 'warning',
      payload: {
        vendorId,
        totalScore,
        responseTimeScore,
        completionRateScore,
        evidenceTimelinessScore,
        remediationRateScore,
      },
    });
  }

  return breakdown;
}

// ── Component Score Helpers (exported for testing) ─────────────────────────

/**
 * Response time score: 0-30 pts.
 * ≤ 1 day avg → 30 pts, ≥ 30 days avg → 0 pts, linear in between.
 * No data → 15 pts (neutral).
 */
export function computeResponseTimeScore(avgDays: number | null): number {
  if (avgDays === null || avgDays === undefined) return Math.round(MAX_RESPONSE_TIME / 2);
  const clamped = Math.max(0, Math.min(30, avgDays));
  // Linear: 30 pts at 0 days, 0 pts at 30 days
  return Math.round(MAX_RESPONSE_TIME * (1 - clamped / 30));
}

/**
 * Completion rate score: 0-25 pts.
 * Proportional to completed / total. No data → 0 pts.
 */
export function computeCompletionRateScore(completed: number, total: number): number {
  if (total === 0) return 0;
  const rate = Math.max(0, Math.min(1, completed / total));
  return Math.round(MAX_COMPLETION_RATE * rate);
}

/**
 * Evidence timeliness score: 0-25 pts.
 * Proportional to on-time / total. No data → 0 pts.
 */
export function computeEvidenceTimelinessScore(onTime: number, total: number): number {
  if (total === 0) return 0;
  const rate = Math.max(0, Math.min(1, onTime / total));
  return Math.round(MAX_EVIDENCE_TIMELINESS * rate);
}

/**
 * Remediation rate score: 0-20 pts.
 * Proportional to resolved / total. No data → 0 pts.
 */
export function computeRemediationRateScore(resolved: number, total: number): number {
  if (total === 0) return 0;
  const rate = Math.max(0, Math.min(1, resolved / total));
  return Math.round(MAX_REMEDIATION_RATE * rate);
}

// ── Score History ──────────────────────────────────────────────────────────

/**
 * Retrieve historical engagement scores for a vendor, ordered by most recent first.
 */
export async function getScoreHistory(
  tenantId: string,
  vendorId: string,
  limit: number = 50,
): Promise<EngagementScoreBreakdown[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT vendor_id, total_score, response_time_score, completion_rate_score,
            evidence_timeliness_score, remediation_rate_score, computed_at
     FROM ${schema}.vendor_engagement_scores
     WHERE vendor_id = $1
     ORDER BY computed_at DESC
     LIMIT $2`,
    [vendorId, limit],
  );

  return result.rows.map(mapRowToBreakdown);
}

// ── Serialization ──────────────────────────────────────────────────────────

/**
 * Serialize an EngagementScoreBreakdown to a JSON string.
 */
export function serializeScore(score: EngagementScoreBreakdown): string {
  return JSON.stringify({
    vendorId: score.vendorId,
    responseTimeScore: score.responseTimeScore,
    completionRateScore: score.completionRateScore,
    evidenceTimelinessScore: score.evidenceTimelinessScore,
    remediationRateScore: score.remediationRateScore,
    totalScore: score.totalScore,
    computedAt: score.computedAt,
  });
}

/**
 * Deserialize a JSON string back to an EngagementScoreBreakdown.
 */
export function deserializeScore(json: string): EngagementScoreBreakdown {
  const obj = JSON.parse(json);
  return {
    vendorId: String(obj.vendorId),
    responseTimeScore: Number(obj.responseTimeScore),
    completionRateScore: Number(obj.completionRateScore),
    evidenceTimelinessScore: Number(obj.evidenceTimelinessScore),
    remediationRateScore: Number(obj.remediationRateScore),
    totalScore: Number(obj.totalScore),
    computedAt: String(obj.computedAt),
  };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

function mapRowToBreakdown(row: Record<string, unknown>): EngagementScoreBreakdown {
  return {
    vendorId: row.vendor_id,
    responseTimeScore: Number(row.response_time_score),
    completionRateScore: Number(row.completion_rate_score),
    evidenceTimelinessScore: Number(row.evidence_timeliness_score),
    remediationRateScore: Number(row.remediation_rate_score),
    totalScore: Number(row.total_score),
    computedAt: row.computed_at instanceof Date
      ? row.computed_at.toISOString()
      : String(row.computed_at),
  };
}
