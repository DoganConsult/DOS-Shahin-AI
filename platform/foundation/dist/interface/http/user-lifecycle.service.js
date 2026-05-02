"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboard = onboard;
exports.offboard = offboard;
exports.suspend = suspend;
exports.reactivate = reactivate;
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function onboard(tenantId, userId) {
    return track('foundation.lifecycle.onboard', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.users SET onboarding_complete = TRUE, member_onboarded = TRUE, updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING user_id, email, display_name, onboarding_complete, member_onboarded`, [userId, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function offboard(tenantId, userId) {
    return track('foundation.lifecycle.offboard', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const userRes = await c.query(`UPDATE dos.users SET status = 'offboarded', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status != 'offboarded'
          RETURNING user_id, email, display_name, status`, [userId, tenantId]);
        const row = userRes.rows[0] ?? null;
        if (!row)
            return null;
        await c.query(`UPDATE dos.role_assignments SET deleted_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [userId, tenantId]);
        await c.query(`UPDATE dos.committee_members SET deleted_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [userId, tenantId]);
        return row;
    }));
}
async function suspend(tenantId, userId) {
    return track('foundation.lifecycle.suspend', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.users SET status = 'suspended', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'active'
          RETURNING user_id, email, display_name, status`, [userId, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function reactivate(tenantId, userId) {
    return track('foundation.lifecycle.reactivate', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.users SET status = 'active', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('suspended','inactive','offboarded')
          RETURNING user_id, email, display_name, status`, [userId, tenantId]);
        return r.rows[0] ?? null;
    }));
}
//# sourceMappingURL=user-lifecycle.service.js.map