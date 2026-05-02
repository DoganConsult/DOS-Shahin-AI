"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPolicies = listPolicies;
exports.getPolicy = getPolicy;
exports.createPolicy = createPolicy;
exports.updatePolicy = updatePolicy;
exports.approvePolicy = approvePolicy;
exports.deletePolicy = deletePolicy;
exports.recordPdplConsent = recordPdplConsent;
exports.getDashboard = getDashboard;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listPolicies(tenantId, opts = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.category) {
        params.push(opts.category);
        conditions.push(`category = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.policy.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.governance_policies ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listRes = await c.query(`SELECT * FROM dos.governance_policies ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return { data: listRes.rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }));
}
async function getPolicy(tenantId, id) {
    return track('foundation.policy.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.governance_policies WHERE policy_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function createPolicy(tenantId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.policy.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.governance_policies
           (policy_id, tenant_id, title_en, title_ar, code, category, scope, description,
            effective_date, review_date, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'draft'), $12, NOW(), NOW())
         RETURNING *`, [id, tenantId, input.title_en, input.title_ar ?? null, input.code ?? null,
            input.category ?? null, input.scope ?? null, input.description ?? null,
            input.effective_date ?? null, input.review_date ?? null, input.status ?? null, actorId]);
        return r.rows[0];
    }));
}
async function updatePolicy(tenantId, id, input) {
    return track('foundation.policy.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.governance_policies
         SET title_en = COALESCE($3, title_en), title_ar = COALESCE($4, title_ar),
             code = COALESCE($5, code), category = COALESCE($6, category),
             scope = COALESCE($7, scope), description = COALESCE($8, description),
             effective_date = COALESCE($9, effective_date), review_date = COALESCE($10, review_date),
             status = COALESCE($11, status), updated_at = NOW()
         WHERE policy_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`, [id, tenantId, input.title_en ?? null, input.title_ar ?? null, input.code ?? null,
            input.category ?? null, input.scope ?? null, input.description ?? null,
            input.effective_date ?? null, input.review_date ?? null, input.status ?? null]);
        return r.rows[0] ?? null;
    }));
}
// W4.F4.5 — policy lifecycle. Approve transitions draft|in_review → approved
// stamping approver/at; publish flips approved → published; retire flips
// published → retired. Each transition is gated by current status; callers
// receive null when row not found AND a 409 when transition is invalid.
async function approvePolicy(tenantId, id, actorId) {
    return track('foundation.policy.approve', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const cur = await c.query(`SELECT status FROM dos.governance_policies WHERE policy_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        if (cur.rows.length === 0)
            return null;
        const s = cur.rows[0].status;
        if (!['draft', 'in_review', 'pending_approval'].includes(s)) {
            const err = new Error(`Cannot approve policy in status '${s}'`);
            err.statusCode = 409;
            err.code = 'INVALID_STATE';
            throw err;
        }
        const r = await c.query(`UPDATE dos.governance_policies
            SET status = 'approved', approved_by = $3, approved_at = NOW(), updated_at = NOW()
          WHERE policy_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING *`, [id, tenantId, actorId]);
        return r.rows[0] ?? null;
    }));
}
async function deletePolicy(tenantId, id) {
    return track('foundation.policy.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.governance_policies SET deleted_at = NOW(), updated_at = NOW()
          WHERE policy_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING policy_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
/**
 * Records a PDPL consent decision. Writes to public.privacy_consent_log when the
 * table exists. If the table is missing the response is explicitly marked
 * `degraded: true` so the UI never treats a synthetic row as a successful
 * persistence. Real DB errors (other than "table missing") propagate.
 */
async function recordPdplConsent(tenantId, userId, consentType, granted) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.policy.pdplConsent', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        try {
            const r = await c.query(`INSERT INTO public.privacy_consent_log
             (id, tenant_id, user_id, consent_type, granted, recorded_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (tenant_id, user_id, consent_type)
           DO UPDATE SET granted = EXCLUDED.granted, recorded_at = NOW()
           RETURNING id::text, tenant_id, user_id, consent_type, granted, recorded_at`, [id, tenantId, userId, consentType, granted]);
            return r.rows[0];
        }
        catch (err) {
            // Postgres "undefined_table" — degraded mode (no persistence yet).
            if (err && (err.code === '42P01' || /relation .* does not exist/i.test(String(err.message)))) {
                return {
                    id,
                    tenant_id: tenantId,
                    user_id: userId,
                    consent_type: consentType,
                    granted,
                    recorded_at: new Date().toISOString(),
                    degraded: true,
                    degradedReason: 'storage_unavailable:public.privacy_consent_log',
                };
            }
            // Any other failure must NOT masquerade as success — propagate.
            throw err;
        }
    }));
}
async function getDashboard(tenantId) {
    return track('foundation.policy.dashboard', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const [policies, orgs, bus, committees] = await Promise.all([
            c.query(`SELECT status, COUNT(*) AS count FROM dos.governance_policies WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`, [tenantId]),
            c.query(`SELECT COUNT(*) AS count FROM dos.organizations WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
            c.query(`SELECT COUNT(*) AS count FROM dos.business_units WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
            c.query(`SELECT COUNT(*) AS count FROM dos.committees WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
        ]);
        return {
            policy_counts: policies.rows,
            total_organizations: parseInt(orgs.rows[0]?.count || '0', 10),
            total_business_units: parseInt(bus.rows[0]?.count || '0', 10),
            total_committees: parseInt(committees.rows[0]?.count || '0', 10),
        };
    }));
}
//# sourceMappingURL=governance-policies.service.js.map