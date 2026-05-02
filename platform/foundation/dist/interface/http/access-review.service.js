"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReviews = listReviews;
exports.getReview = getReview;
exports.listItems = listItems;
exports.createReview = createReview;
exports.updateReview = updateReview;
exports.startReview = startReview;
exports.deleteReview = deleteReview;
exports.decideItem = decideItem;
exports.closeReview = closeReview;
const crypto_1 = require("crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listReviews(tenantId, opts = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.status) {
        params.push(opts.status);
        conditions.push(`status = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.review.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const countRes = await c.query(`SELECT COUNT(*)::int AS count FROM dos.access_reviews ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listRes = await c.query(`SELECT * FROM dos.access_reviews ${where}
          ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return { data: listRes.rows, total: countRes.rows[0]?.count ?? 0 };
    }));
}
async function getReview(tenantId, id) {
    return track('foundation.review.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.access_reviews WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function listItems(tenantId, reviewId) {
    return track('foundation.review.items', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT ari.*, u.email, u.display_name
           FROM dos.access_review_items ari
           LEFT JOIN dos.users u ON u.user_id = ari.user_id
          WHERE ari.review_id = $1 AND ari.tenant_id = $2
          ORDER BY ari.created_at DESC`, [reviewId, tenantId]);
        return r.rows;
    }));
}
async function createReview(tenantId, input, actorId) {
    const id = (0, crypto_1.randomUUID)();
    const name = (input.campaign_name ?? input.title ?? '').trim();
    if (!name) {
        const err = new Error('campaign_name (or title) required');
        err.statusCode = 400;
        err.code = 'VALIDATION_FAILED';
        throw err;
    }
    return track('foundation.review.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.access_reviews
           (review_id, tenant_id, campaign_name, description, scope, status, created_by, due_date, review_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'draft', $6, $7, $8, NOW(), NOW())
         RETURNING *`, [id, tenantId, name, input.description ?? null,
            input.scope ? JSON.stringify(input.scope) : null,
            actorId,
            input.due_date ?? null,
            input.review_type ?? 'periodic']);
        return r.rows[0];
    }));
}
async function updateReview(tenantId, id, input) {
    return track('foundation.review.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        // Only draft campaigns are mutable.
        const cur = await c.query(`SELECT status FROM dos.access_reviews WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        if (cur.rows.length === 0)
            return null;
        if (cur.rows[0].status !== 'draft') {
            const err = new Error('Only draft campaigns can be modified');
            err.statusCode = 409;
            err.code = 'INVALID_STATE';
            throw err;
        }
        const r = await c.query(`UPDATE dos.access_reviews
            SET campaign_name = COALESCE($3, campaign_name),
                description   = COALESCE($4, description),
                scope         = COALESCE($5::jsonb, scope),
                due_date      = COALESCE($6, due_date),
                updated_at    = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING *`, [id, tenantId,
            (input.campaign_name ?? input.title) ?? null,
            input.description ?? null,
            input.scope ? JSON.stringify(input.scope) : null,
            input.due_date ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function startReview(tenantId, id) {
    return track('foundation.review.start', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.access_reviews
            SET status = 'active', updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status = 'draft'
        RETURNING *`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function deleteReview(tenantId, id) {
    return track('foundation.review.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.access_reviews
            SET status = 'cancelled', deleted_at = NOW(), updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING review_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
async function decideItem(tenantId, reviewId, itemId, decision, comment, actorId) {
    return track('foundation.review.decide', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.access_review_items
            SET decision = $3, decided_by = $4, decided_at = NOW(),
                notes = COALESCE($5, notes), updated_at = NOW()
          WHERE item_id = $1 AND tenant_id = $2 AND review_id = $6
        RETURNING *`, [itemId, tenantId, decision, actorId, comment, reviewId]);
        return r.rows[0] ?? null;
    }));
}
async function closeReview(tenantId, id) {
    return track('foundation.review.close', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.access_reviews SET status = 'closed', closed_at = NOW(), updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'open'
        RETURNING *`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
//# sourceMappingURL=access-review.service.js.map