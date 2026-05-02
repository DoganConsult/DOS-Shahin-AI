import type { EngagementScoreBreakdown } from '@dos/types';
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
export declare function computeEngagementScore(tenantId: string, vendorId: string): Promise<EngagementScoreBreakdown>;
/**
 * Response time score: 0-30 pts.
 * ≤ 1 day avg → 30 pts, ≥ 30 days avg → 0 pts, linear in between.
 * No data → 15 pts (neutral).
 */
export declare function computeResponseTimeScore(avgDays: number | null): number;
/**
 * Completion rate score: 0-25 pts.
 * Proportional to completed / total. No data → 0 pts.
 */
export declare function computeCompletionRateScore(completed: number, total: number): number;
/**
 * Evidence timeliness score: 0-25 pts.
 * Proportional to on-time / total. No data → 0 pts.
 */
export declare function computeEvidenceTimelinessScore(onTime: number, total: number): number;
/**
 * Remediation rate score: 0-20 pts.
 * Proportional to resolved / total. No data → 0 pts.
 */
export declare function computeRemediationRateScore(resolved: number, total: number): number;
/**
 * Retrieve historical engagement scores for a vendor, ordered by most recent first.
 */
export declare function getScoreHistory(tenantId: string, vendorId: string, limit?: number): Promise<EngagementScoreBreakdown[]>;
/**
 * Serialize an EngagementScoreBreakdown to a JSON string.
 */
export declare function serializeScore(score: EngagementScoreBreakdown): string;
/**
 * Deserialize a JSON string back to an EngagementScoreBreakdown.
 */
export declare function deserializeScore(json: string): EngagementScoreBreakdown;
