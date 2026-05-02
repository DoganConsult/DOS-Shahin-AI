import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import type { AccessReviewRequest } from '../types/dauth.types';

export async function createAccessReview(
  tenantId: string,
  userId: string,
  reviewerId: string,
  reviewType: 'periodic' | 'triggered' | 'offboarding',
): Promise<AccessReviewRequest> {
  const schema = tenantSchema(tenantId);
  const reviewId = uuid();

  const { rows: raRows } = await safeQuery(
    `SELECT role_code FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`,
    [userId],
  );
  const roleAssignments = raRows.map(( r: any) => r.role_code);

  await safeQuery(
    `INSERT INTO "${schema}".access_reviews
       (review_id, tenant_id, user_id, reviewer_id, status, review_type, role_assignments, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW())`,
    [reviewId, tenantId, userId, reviewerId, reviewType, JSON.stringify(roleAssignments)],
  );

  await publish('dauth.access_review.created', tenantId, { reviewId, userId, reviewerId, reviewType });

  return {
    reviewId,
    tenantId,
    userId,
    reviewerId,
    status: 'pending',
    reviewType,
    roleAssignments,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export async function completeAccessReview(
  tenantId: string,
  reviewId: string,
  decision: 'approved' | 'revoked',
  reviewerId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".access_reviews
     SET status = $1, completed_at = NOW(), completed_by = $2
     WHERE review_id = $3 AND status = 'pending'`,
    [decision, reviewerId, reviewId],
  );
  if ((result.rowCount ?? 0) > 0) {
    await publish('dauth.access_review.completed', tenantId, { reviewId, decision, reviewerId });
    return true;
  }
  return false;
}

export async function getPendingAccessReviews(tenantId: string, reviewerId?: string): Promise<AccessReviewRequest[]> {
  const schema = tenantSchema(tenantId);
  const filter = reviewerId ? `AND reviewer_id = $1` : '';
  const params: unknown[] = reviewerId ? [reviewerId] : [];
  const { rows } = await safeQuery(
    `SELECT review_id, tenant_id, user_id, reviewer_id, status, review_type,
            role_assignments, created_at, completed_at
     FROM "${schema}".access_reviews
     WHERE status = 'pending' ${filter}
     ORDER BY created_at ASC`,
    params,
  );
  return rows.map(( r: any) => ({
    reviewId: r.review_id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    reviewerId: r.reviewer_id,
    status: r.status,
    reviewType: r.review_type,
    roleAssignments: r.role_assignments ?? [],
    createdAt: r.created_at?.toISOString?.() ?? '',
    completedAt: r.completed_at?.toISOString?.() ?? null,
  }));
}

export async function getAccessReviewHistory(tenantId: string, userId: string): Promise<AccessReviewRequest[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT review_id, tenant_id, user_id, reviewer_id, status, review_type,
            role_assignments, created_at, completed_at
     FROM "${schema}".access_reviews
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(( r: any) => ({
    reviewId: r.review_id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    reviewerId: r.reviewer_id,
    status: r.status,
    reviewType: r.review_type,
    roleAssignments: r.role_assignments ?? [],
    createdAt: r.created_at?.toISOString?.() ?? '',
    completedAt: r.completed_at?.toISOString?.() ?? null,
  }));
}
