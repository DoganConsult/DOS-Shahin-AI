import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function listReviews(
  tenantId: string,
  filters?: { policy_id?: string; reviewer_id?: string; review_type?: string; outcome?: string }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_policy_reviews WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.policy_id) { sql += ` AND policy_id = $${idx++}`; params.push(filters.policy_id); }
  if (filters?.reviewer_id) { sql += ` AND reviewer_id = $${idx++}`; params.push(filters.reviewer_id); }
  if (filters?.review_type) { sql += ` AND review_type = $${idx++}`; params.push(filters.review_type); }
  if (filters?.outcome) { sql += ` AND outcome = $${idx++}`; params.push(filters.outcome); }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getReviewQueue(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT r.*, (r.next_review_date IS NOT NULL AND r.next_review_date < NOW()) AS overdue
     FROM "${schema}".governance_policy_reviews r
     WHERE r.deleted_at IS NULL AND r.outcome IN ('pending','needs_revision')
     ORDER BY r.next_review_date ASC NULLS LAST`
  );
  return result.rows;
}

export async function getOverdueReviews(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_policy_reviews
     WHERE deleted_at IS NULL AND next_review_date IS NOT NULL
       AND next_review_date < NOW() AND outcome NOT IN ('approved')
     ORDER BY next_review_date`
  );
  return result.rows;
}

export async function getReviewById(tenantId: string, reviewId: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createReview(tenantId: string, data: {
  policy_id: string;
  reviewer_id?: string;
  review_type?: string;
  outcome?: string;
  comments?: string;
  next_review_date?: string;
  created_by?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_policy_reviews
      (policy_id, reviewer_id, review_type, outcome, comments, next_review_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.policy_id, data.reviewer_id || data.created_by || null,
     data.review_type || 'periodic', data.outcome || 'pending',
     data.comments || null, data.next_review_date || null, data.created_by || null]
  );
  return result.rows[0];
}

export async function updateReview(tenantId: string, reviewId: string, data: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function softDeleteReview(tenantId: string, reviewId: string, deletedBy?: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_policy_reviews SET deleted_at = NOW(), updated_by = $2 WHERE review_id = $1 AND deleted_at IS NULL RETURNING review_id`,
    [reviewId, deletedBy || null]
  );
  return result.rows.length > 0;
}
