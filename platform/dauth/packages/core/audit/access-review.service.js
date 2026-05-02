"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessReview = createAccessReview;
exports.completeAccessReview = completeAccessReview;
exports.getPendingAccessReviews = getPendingAccessReviews;
exports.getAccessReviewHistory = getAccessReviewHistory;
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function createAccessReview(tenantId, userId, reviewerId, reviewType) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const reviewId = (0, uuid_1.v4)();
    const { rows: raRows } = await (0, db_1.safeQuery)(`SELECT role_code FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`, [userId]);
    const roleAssignments = raRows.map((r) => r.role_code);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".access_reviews
       (review_id, tenant_id, user_id, reviewer_id, status, review_type, role_assignments, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW())`, [reviewId, tenantId, userId, reviewerId, reviewType, JSON.stringify(roleAssignments)]);
    await (0, publish_with_dsoc_1.publish)('dauth.access_review.created', tenantId, { reviewId, userId, reviewerId, reviewType });
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
async function completeAccessReview(tenantId, reviewId, decision, reviewerId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".access_reviews
     SET status = $1, completed_at = NOW(), completed_by = $2
     WHERE review_id = $3 AND status = 'pending'`, [decision, reviewerId, reviewId]);
    if ((result.rowCount ?? 0) > 0) {
        await (0, publish_with_dsoc_1.publish)('dauth.access_review.completed', tenantId, { reviewId, decision, reviewerId });
        return true;
    }
    return false;
}
async function getPendingAccessReviews(tenantId, reviewerId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const filter = reviewerId ? `AND reviewer_id = $1` : '';
    const params = reviewerId ? [reviewerId] : [];
    const { rows } = await (0, db_1.safeQuery)(`SELECT review_id, tenant_id, user_id, reviewer_id, status, review_type,
            role_assignments, created_at, completed_at
     FROM "${schema}".access_reviews
     WHERE status = 'pending' ${filter}
     ORDER BY created_at ASC`, params);
    return rows.map((r) => ({
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
async function getAccessReviewHistory(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT review_id, tenant_id, user_id, reviewer_id, status, review_type,
            role_assignments, created_at, completed_at
     FROM "${schema}".access_reviews
     WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return rows.map((r) => ({
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
//# sourceMappingURL=access-review.service.js.map