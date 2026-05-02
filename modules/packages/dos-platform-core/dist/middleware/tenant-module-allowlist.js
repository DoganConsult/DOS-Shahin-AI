"use strict";
/**
 * Tenant module allowlist middleware — caches per-tenant module entitlements
 * and provides cache invalidation on module state changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateTenantAllowlist = invalidateTenantAllowlist;
exports.getTenantAllowlist = getTenantAllowlist;
const tenantAllowlistCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Invalidate the cached module allowlist for a tenant.
 * Called after module state changes (enable/disable/trial).
 */
function invalidateTenantAllowlist(tenantId) {
    tenantAllowlistCache.delete(tenantId);
}
/**
 * Get the set of enabled module codes for a tenant.
 * Returns from cache if available and not expired.
 */
async function getTenantAllowlist(tenantId) {
    const cached = tenantAllowlistCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.modules;
    }
    try {
        const { safeQuery } = await import('@dos/db');
        const res = await safeQuery(`SELECT module_code FROM public.tenant_module_states
       WHERE tenant_id = $1 AND state IN ('on', 'trial')`, [tenantId]);
        const modules = new Set(res.rows.map((r) => r.module_code));
        tenantAllowlistCache.set(tenantId, { modules, cachedAt: Date.now() });
        return modules;
    }
    catch {
        return new Set();
    }
}
//# sourceMappingURL=tenant-module-allowlist.js.map