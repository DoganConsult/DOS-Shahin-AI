import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export interface MandatoryReviewPoint {
  review_point_id: string;
  step_type: string;
  step_sub_type: string | null;
  requires_human_review: boolean;
  min_confidence_to_skip: number;
  review_role: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ReviewPointCheckResult {
  requiresReview: boolean;
  minConfidenceToSkip: number;
  reviewRole: string | null;
  reason: string | null;
  source: 'explicit' | 'default';
}

export async function getReviewPoints(
  tenantId: string,
  activeOnly = true,
): Promise<MandatoryReviewPoint[]> {
  const schema = tenantSchema(tenantId);
  const where = activeOnly ? 'WHERE is_active = TRUE' : '';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_mandatory_review_points ${where}
     ORDER BY step_type, step_sub_type`,
    [],
  );
  return result.rows.map(mapRow);
}

export async function checkReviewRequired(
  tenantId: string,
  stepType: string,
  stepSubType?: string,
  confidence?: number,
): Promise<ReviewPointCheckResult> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_mandatory_review_points
     WHERE is_active = TRUE
       AND step_type = $1
       AND (step_sub_type IS NULL OR step_sub_type = $2)
     ORDER BY CASE WHEN step_sub_type IS NOT NULL THEN 0 ELSE 1 END
     LIMIT 1`,
    [stepType, stepSubType || null],
  );

  if (result.rows.length === 0) {
    return {
      requiresReview: false,
      minConfidenceToSkip: 1.0,
      reviewRole: null,
      reason: null,
      source: 'default',
    };
  }

  const point = mapRow(getFirstRow(result));

  const canSkip = confidence !== undefined && confidence >= point.min_confidence_to_skip;
  const requiresReview = point.requires_human_review && !canSkip;

  return {
    requiresReview,
    minConfidenceToSkip: point.min_confidence_to_skip,
    reviewRole: point.review_role,
    reason: point.reason,
    source: 'explicit',
  };
}

export async function upsertReviewPoint(
  tenantId: string,
  input: {
    stepType: string;
    stepSubType?: string;
    requiresHumanReview?: boolean;
    minConfidenceToSkip?: number;
    reviewRole?: string;
    reason?: string;
  },
): Promise<MandatoryReviewPoint> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_mandatory_review_points
       (step_type, step_sub_type, requires_human_review, min_confidence_to_skip, review_role, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.stepType,
      input.stepSubType || null,
      input.requiresHumanReview !== false,
      input.minConfidenceToSkip ?? 1.0,
      input.reviewRole || null,
      input.reason || null,
    ],
  );
  return mapRow(getFirstRow(result));
}

export async function deactivateReviewPoint(
  tenantId: string,
  reviewPointId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_mandatory_review_points
     SET is_active = FALSE WHERE review_point_id = $1`,
    [reviewPointId],
  );
  return (result.rowCount ?? 0) > 0;
}

function mapRow(row: Record<string, unknown>): MandatoryReviewPoint {
  return {

    review_point_id: row.review_point_id,

    step_type: row.step_type,

    step_sub_type: row.step_sub_type || null,

    requires_human_review: row.requires_human_review ?? true,
    min_confidence_to_skip: Number(row.min_confidence_to_skip ?? 1.0),

    review_role: row.review_role || null,

    reason: row.reason || null,

    is_active: row.is_active ?? true,

    created_at: row.created_at,
  };
}
