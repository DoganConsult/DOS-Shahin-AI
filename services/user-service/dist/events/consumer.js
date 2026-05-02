"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsumer = startConsumer;
const module_sdk_1 = require("@dos/module-sdk");
const db_1 = require("@dos/db");
const metrics_1 = require("../observability/metrics");
const SERVICE_ID = 'user-service';
function eventTenantId(event) {
    return event.tenantId ?? event.tenant_id;
}
function eventUserId(event) {
    const payload = (event.data ?? event.payload ?? {});
    return (payload.userId ??
        event.entityId ??
        event.userId);
}
/**
 * Wrap a handler so that (a) failures are logged instead of silently swallowed
 * and (b) metrics are observed. We intentionally do NOT re-throw — event bus
 * semantics are at-least-once and the handler must be idempotent.
 */
function safeHandler(eventName, fn) {
    return async (event) => {
        const start = Date.now();
        try {
            await fn(event);
        }
        catch (err) {
            module_sdk_1.logger.error('[user-service.consumer] Handler failed', {
                event: eventName,
                tenantId: eventTenantId(event),
                error: (0, module_sdk_1.toErrorMessage)(err),
            });
        }
        finally {
            metrics_1.userMetrics.observeDb(`event.${eventName}`, Date.now() - start);
        }
    };
}
async function handleAuthLoginSuccess(event) {
    const tenantId = eventTenantId(event);
    const userId = eventUserId(event);
    if (!tenantId || !userId)
        return;
    await (0, db_1.withTenantClient)(tenantId, async (c) => c.query(`UPDATE dos.users SET updated_at = NOW() WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]));
}
async function handleTenantUserProvisioned(event) {
    const tenantId = eventTenantId(event);
    if (!tenantId)
        return;
    const payload = (event.data ?? event.payload ?? {});
    const userId = payload.userId ?? event.entityId;
    const platformRole = payload.platformRole ?? payload.role;
    if (!userId || !platformRole)
        return;
    await (0, db_1.withTenantClient)(tenantId, async (c) => c.query(`UPDATE dos.users SET role = $2, updated_at = NOW() WHERE user_id = $1 AND tenant_id = $3`, [userId, platformRole, tenantId]));
}
async function handleFoundationDeptUpdated(event) {
    const tenantId = eventTenantId(event);
    const deptId = event.entityId;
    if (!tenantId || !deptId)
        return;
    await (0, db_1.withTenantClient)(tenantId, async (c) => c.query(`UPDATE dos.users
         SET updated_at = NOW()
       WHERE department_id = $1 AND tenant_id = $2`, [deptId, tenantId]));
}
async function handleTenantDeleted(event) {
    const tenantId = eventTenantId(event);
    if (!tenantId)
        return;
    await (0, db_1.withTenantClient)(tenantId, async (c) => {
        await c.query(`UPDATE dos.teams SET deleted_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]);
        await c.query(`UPDATE dos.departments SET deleted_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]);
        await c.query(`UPDATE dos.user_role_assignments SET is_active = FALSE, revoked_at = NOW()
         WHERE tenant_id = $1 AND is_active = TRUE`, [tenantId]);
    });
    module_sdk_1.logger.info('[user-service.consumer] Tenant soft-deleted', { tenantId });
}
async function handleAuthUserSuspended(event) {
    const tenantId = eventTenantId(event);
    const userId = eventUserId(event);
    if (!tenantId || !userId)
        return;
    await (0, db_1.withTenantClient)(tenantId, async (c) => c.query(`UPDATE public.users SET status = 'suspended', updated_at = NOW()
         WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]));
}
function startConsumer() {
    (0, module_sdk_1.subscribeEvent)('auth.login_success', SERVICE_ID, safeHandler('auth.login_success', handleAuthLoginSuccess));
    (0, module_sdk_1.subscribeEvent)('tenant.user_provisioned', SERVICE_ID, safeHandler('tenant.user_provisioned', handleTenantUserProvisioned));
    (0, module_sdk_1.subscribeEvent)('foundation.dept_updated', SERVICE_ID, safeHandler('foundation.dept_updated', handleFoundationDeptUpdated));
    (0, module_sdk_1.subscribeEvent)('tenant.deleted', SERVICE_ID, safeHandler('tenant.deleted', handleTenantDeleted));
    (0, module_sdk_1.subscribeEvent)('auth.user_suspended', SERVICE_ID, safeHandler('auth.user_suspended', handleAuthUserSuspended));
    return Promise.resolve();
}
//# sourceMappingURL=consumer.js.map