"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BULK_INVITE_MAX = void 0;
exports.runBulkInvite = runBulkInvite;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
exports.BULK_INVITE_MAX = 500;
async function runBulkInvite(tenantId, invites) {
    const batchId = (0, node_crypto_1.randomUUID)();
    const results = [];
    await track('foundation.bulk.invite', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        for (const invite of invites) {
            const { email, role, department_id, display_name } = invite;
            if (!email) {
                results.push({ email: email || 'unknown', status: 'skipped', error: 'email is required' });
                continue;
            }
            try {
                const existing = await c.query(`SELECT user_id FROM dos.users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [email, tenantId]);
                if (existing.rows.length) {
                    results.push({ email, status: 'skipped', error: 'User already exists' });
                    continue;
                }
                const userId = (0, node_crypto_1.randomUUID)();
                await c.query(`INSERT INTO dos.users (user_id, email, display_name, role, status, tenant_id, department_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'invited', $5, $6, NOW(), NOW())`, [userId, email, display_name ?? null, role ?? 'member', tenantId, department_id ?? null]);
                results.push({ email, status: 'invited' });
            }
            catch (err) {
                results.push({ email, status: 'failed', error: err.message });
            }
        }
    }));
    const invited = results.filter((r) => r.status === 'invited').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    return { batch_id: batchId, total: invites.length, invited, skipped, failed, details: results };
}
//# sourceMappingURL=bulk-invite.service.js.map