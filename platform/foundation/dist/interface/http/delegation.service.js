"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDelegations = listDelegations;
exports.getDelegation = getDelegation;
exports.createDelegation = createDelegation;
exports.approveDelegation = approveDelegation;
exports.rejectDelegation = rejectDelegation;
exports.revokeDelegation = revokeDelegation;
const crypto_1 = require("crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
const TBL = 'dos.delegations';
const TBL_RAW = 'platform_dauth.delegations';
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listDelegations(tenantId, opts) {
    const conditions = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
    const params = [tenantId];
    if (!opts.isAdmin) {
        params.push(opts.actorId);
        const pIdx = params.length;
        switch (opts.direction) {
            case 'from':
                conditions.push(`d.delegator_id = $${pIdx}`);
                break;
            case 'to':
                conditions.push(`d.delegate_id  = $${pIdx}`);
                break;
            default: conditions.push(`(d.delegator_id = $${pIdx} OR d.delegate_id = $${pIdx})`);
        }
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.delegation.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT d.delegation_id, d.tenant_id,
                d.delegator_id, d.delegate_id,
                d.scope, d.permissions,
                d.valid_from, d.valid_until,
                d.reason, d.status, d.approved_by, d.approved_at, d.rejected_reason,
                d.created_by, d.created_at, d.updated_at,
                dr.email AS delegator_email, dr.display_name AS delegator_name,
                de.email AS delegate_email,  de.display_name AS delegate_name
           FROM ${TBL} d
           LEFT JOIN dos.users dr ON dr.user_id = d.delegator_id
           LEFT JOIN dos.users de ON de.user_id = d.delegate_id
           ${where} ORDER BY d.created_at DESC`, params);
        return r.rows;
    }));
}
async function getDelegation(tenantId, id) {
    return track('foundation.delegation.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT d.delegation_id, d.tenant_id,
                d.delegator_id, d.delegate_id,
                d.scope, d.permissions, d.valid_from, d.valid_until,
                d.reason, d.status, d.approved_by, d.approved_at, d.rejected_reason,
                d.created_by, d.created_at, d.updated_at,
                dr.email AS delegator_email, de.email AS delegate_email
           FROM ${TBL} d
           LEFT JOIN dos.users dr ON dr.user_id = d.delegator_id
           LEFT JOIN dos.users de ON de.user_id = d.delegate_id
          WHERE d.delegation_id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function createDelegation(tenantId, input, actorId) {
    const id = (0, crypto_1.randomUUID)();
    const delegator = input.delegator_id ?? actorId;
    const initialStatus = input.requires_approval ? 'pending_approval' : 'active';
    return track('foundation.delegation.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO ${TBL_RAW}
           (delegation_id, tenant_id, from_user_id, to_user_id, scope, permissions,
            valid_from, valid_until, reason, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), $6,
                 COALESCE($7, NOW()), $8, $9, $10, $11, NOW(), NOW())
         RETURNING delegation_id, tenant_id,
                   from_user_id AS delegator_id, to_user_id AS delegate_id,
                   scope, permissions, valid_from, valid_until,
                   reason, status, approved_by, approved_at, rejected_reason,
                   created_by, created_at, updated_at`, [
            id, tenantId, delegator, input.delegate_id,
            input.scope ? JSON.stringify(input.scope) : null,
            input.permissions ? JSON.stringify(input.permissions) : null,
            input.effective_from ?? null, input.effective_to ?? null,
            input.reason ?? null, initialStatus, actorId,
        ]);
        return r.rows[0];
    }));
}
async function approveDelegation(tenantId, id, actorId) {
    return track('foundation.delegation.approve', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE ${TBL_RAW}
            SET status = 'approved', approved_by = $3, approved_at = NOW(), updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('pending_approval','active')
        RETURNING delegation_id, tenant_id,
                  from_user_id AS delegator_id, to_user_id AS delegate_id,
                  scope, permissions, valid_from, valid_until,
                  reason, status, approved_by, approved_at, rejected_reason,
                  created_by, created_at, updated_at`, [id, tenantId, actorId]);
        return r.rows[0] ?? null;
    }));
}
async function rejectDelegation(tenantId, id, actorId, reason) {
    return track('foundation.delegation.reject', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE ${TBL_RAW}
            SET status = 'rejected', approved_by = $3, approved_at = NOW(),
                rejected_reason = $4, updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('pending_approval','active')
        RETURNING delegation_id, tenant_id,
                  from_user_id AS delegator_id, to_user_id AS delegate_id,
                  scope, permissions, valid_from, valid_until,
                  reason, status, approved_by, approved_at, rejected_reason,
                  created_by, created_at, updated_at`, [id, tenantId, actorId, reason]);
        return r.rows[0] ?? null;
    }));
}
async function revokeDelegation(tenantId, id) {
    return track('foundation.delegation.revoke', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE ${TBL_RAW}
            SET status = 'revoked', deleted_at = NOW(), updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING delegation_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
//# sourceMappingURL=delegation.service.js.map