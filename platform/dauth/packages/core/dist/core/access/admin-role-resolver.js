"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminProfile = isAdminProfile;
exports.isFullAccessProfile = isFullAccessProfile;
exports.getAdminProfiles = getAdminProfiles;
exports.getFullAccessProfiles = getFullAccessProfiles;
exports.invalidateAdminRoleCache = invalidateAdminRoleCache;
/**
 * DAuth Admin Role Resolver — DB-driven admin role classification.
 *
 * Replaces hardcoded ADMIN_ROLES / FULL_ACCESS_PROFILES Sets scattered
 * across platform services. Queries access_profiles table with TTL cache.
 *
 * Law 3: Data-driven security.
 */
const db_1 = require("@dos/db");
const CACHE_TTL = 120_000; // 2 minutes
const cache = new Map();
/** Fallback used during bootstrap when DB tables may not exist yet. */
const FALLBACK_ADMIN_PROFILES = new Set(['tenant_admin', 'platform_super_admin', 'owner', 'admin']);
const FALLBACK_FULL_ACCESS = new Set(['platform_super_admin', 'tenant_admin', 'module_admin']);
async function loadAdminRoles(tenantId) {
    const cached = cache.get(tenantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL)
        return cached;
    try {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const { rows } = await (0, db_1.safeQuery)(`SELECT code, is_admin, grants_full_module_access
       FROM "${schema}".access_profiles
       WHERE (is_admin = TRUE OR grants_full_module_access = TRUE)`);
        const adminProfiles = new Set();
        const fullAccessProfiles = new Set();
        for (const row of rows) {
            if (row.is_admin)
                adminProfiles.add(row.code);
            if (row.grants_full_module_access)
                fullAccessProfiles.add(row.code);
        }
        const entry = { adminProfiles, fullAccessProfiles, ts: Date.now() };
        cache.set(tenantId, entry);
        return entry;
    }
    catch {
        return { adminProfiles: FALLBACK_ADMIN_PROFILES, fullAccessProfiles: FALLBACK_FULL_ACCESS, ts: 0 };
    }
}
/** Check if a profile code grants admin-level access. */
async function isAdminProfile(tenantId, profileCode) {
    const { adminProfiles } = await loadAdminRoles(tenantId);
    return adminProfiles.has(profileCode);
}
/** Check if a profile code grants full module visibility. */
async function isFullAccessProfile(tenantId, profileCode) {
    const { fullAccessProfiles } = await loadAdminRoles(tenantId);
    return fullAccessProfiles.has(profileCode);
}
/** Get all admin profile codes for a tenant. */
async function getAdminProfiles(tenantId) {
    const { adminProfiles } = await loadAdminRoles(tenantId);
    return adminProfiles;
}
/** Get all full-access profile codes for a tenant. */
async function getFullAccessProfiles(tenantId) {
    const { fullAccessProfiles } = await loadAdminRoles(tenantId);
    return fullAccessProfiles;
}
/** Invalidate cache. */
function invalidateAdminRoleCache(tenantId) {
    if (tenantId)
        cache.delete(tenantId);
    else
        cache.clear();
}
//# sourceMappingURL=admin-role-resolver.js.map