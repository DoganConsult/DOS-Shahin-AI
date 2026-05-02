// ============================================
// Evidence Reviews
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { transitionStatus } from "../core/evidence-lifecycle.service";
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function getEvidenceReviews(tenantId: string, filters?: { status?: string; evidenceId?: string }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT r.review_id, r.evidence_id, r.reviewer_id, r.review_type, r.outcome,
                    r.comments, r.reviewed_at, r.created_at,
                    e.title AS evidence_title, e.control_id
             FROM "${schema}".evidence_reviews r
             JOIN "${schema}".evidence e ON e.evidence_id = r.evidence_id
             WHERE r.deleted_at IS NULL`;
  const vals: unknown[] = [];
  let idx = 1;
  if (filters?.status) { sql += ` AND r.outcome = $${idx++}`; vals.push(filters.status); }
  if (filters?.evidenceId) { sql += ` AND r.evidence_id = $${idx++}`; vals.push(filters.evidenceId); }
  sql += ` ORDER BY r.reviewed_at DESC`;
  const result = await safeQuery(sql, vals);
  return result.rows;
}

export async function createEvidenceReview(tenantId: string, evidenceId: string, data: {
  reviewerId: string; outcome: string; reviewType?: string; comments?: string;
}): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ============================================
// Enterprise Review — Quality Assessment, Review Queue, Request More Info
// ============================================

/**
 * Create a quality assessment tied to a review decision.
 */
export async function createQualityAssessment(tenantId: string, evidenceId: string, data: {
  reviewId?: string;
  completenessResult: string;
  scopeMatchResult: string;
  authenticityResult?: string;
  readabilityResult?: string;
  qualityScore: number;
  notes?: string;
  assessedBy: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_quality_assessments
       (evidence_id, review_id, completeness_result, scope_match_result, authenticity_result,
        readability_result, quality_score, notes, assessed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      evidenceId,
      data.reviewId || null,
      data.completenessResult,
      data.scopeMatchResult,
      data.authenticityResult || 'not_assessed',
      data.readabilityResult || 'not_assessed',
      data.qualityScore,
      data.notes || null,
      data.assessedBy,
    ]
  );

  // Update quality_status on the evidence record based on score
  let qualityStatus = 'poor';
  if (data.qualityScore >= 90) qualityStatus = 'excellent';
  else if (data.qualityScore >= 75) qualityStatus = 'good';
  else if (data.qualityScore >= 60) qualityStatus = 'acceptable';

  await safeQuery(
    `UPDATE "${schema}".evidence SET quality_status = $1, updated_at = NOW() WHERE evidence_id = $2`,
    [qualityStatus, evidenceId]
  );

  return getFirstRow(result);
}

/**
 * Get the review queue — evidence pending review, sorted by priority and age.
 */
export async function getReviewQueue(tenantId: string, filters?: {
  reviewerId?: string;
  evidenceType?: string;
  frameworkCode?: string;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT e.evidence_id, e.title, e.evidence_type, e.control_id, e.framework_code,
                    e.status, e.owner_user_id, e.submitted_by, e.created_at,
                    EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 86400 AS age_days
             FROM "${schema}".evidence e
             WHERE e.status IN ('submitted', 'validating', 'under_review')
               AND e.deleted_at IS NULL`;
  const vals: unknown[] = [];
  let idx = 1;

  if (filters?.evidenceType) {
    sql += ` AND e.evidence_type = $${idx++}`;
    vals.push(filters.evidenceType);
  }
  if (filters?.frameworkCode) {
    sql += ` AND e.framework_code = $${idx++}`;
    vals.push(filters.frameworkCode);
  }

  sql += ` ORDER BY e.created_at ASC`;
  const result = await safeQuery(sql, vals);
  return result.rows;
}

/**
 * Request more information on evidence — sets status to needs_revision.
 */
export async function requestMoreInfo(tenantId: string, evidenceId: string, reviewerId: string, note: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Create review record with needs_revision outcome
  const reviewResult = await safeQuery(
    `INSERT INTO "${schema}".evidence_reviews (evidence_id, reviewer_id, review_type, outcome, comments)
     VALUES ($1, $2, 'information_request', 'needs_revision', $3) RETURNING *`,
    [evidenceId, reviewerId, note]
  );

  // Transition evidence status
  try {
    await transitionStatus(tenantId, evidenceId, 'under_review' as any, reviewerId, `More info requested: ${note}`);
  } catch { /* best-effort */ }

  try {
    await eventBus.publish('evidence.more_info_requested', tenantId, { reviewerId, note }, { severity: 'info' });
  } catch { /* best-effort */ }

  return getFirstRow(reviewResult);
}

/**
 * Get quality assessments for an evidence item.
 */
export async function getQualityAssessments(tenantId: string, evidenceId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, evidence_id, review_id, completeness_result, scope_match_result,
            authenticity_result, readability_result, quality_score, notes, assessed_by, assessed_at
     FROM "${schema}".evidence_quality_assessments
     WHERE evidence_id = $1
     ORDER BY assessed_at DESC`,
    [evidenceId]
  );
  return result.rows;
}

/**
 * Get review statistics for dashboard.
 */
export async function getReviewStats(tenantId: string): Promise<{
  totalReviews: number;
  accepted: number;
  rejected: number;
  needsRevision: number;
  avgReviewTimeDays: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE outcome = 'accepted') AS accepted,
       COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected,
       COUNT(*) FILTER (WHERE outcome = 'needs_revision') AS needs_revision,
       AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 86400) AS avg_days
     FROM "${schema}".evidence_reviews
     WHERE deleted_at IS NULL`,
    []
  );
  const row = result.rows[0] || {};
  return {
    totalReviews: parseInt(row.total || '0', 10),
    accepted: parseInt(row.accepted || '0', 10),
    rejected: parseInt(row.rejected || '0', 10),
    needsRevision: parseInt(row.needs_revision || '0', 10),
    avgReviewTimeDays: Math.round((parseFloat(row.avg_days || '0') + Number.EPSILON) * 10) / 10,
  };
}
