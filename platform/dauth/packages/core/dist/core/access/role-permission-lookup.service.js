"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolePermissionCodes = getRolePermissionCodes;
exports.hasRolePermission = hasRolePermission;
exports.getEffectivePermissionCodes = getEffectivePermissionCodes;
exports.invalidateRolePermissionCache = invalidateRolePermissionCache;
/**
 * Role-Permission Lookup Service — DB-driven, cached
 *
 * REPLACES all hardcoded ROLE_PERMISSIONS maps across the codebase.
 * Canonical source: DAuth role_permissions + functional_roles + permissions tables.
 *
 * Law 3: Data-driven security — permissions from registries, not hardcoded.
 * Law 2: DAuth is the single owner of permission truth.
 *
 * @owner DAuth
 */
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
// ── In-memory cache with TTL ────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** tenantId::roleCode → permission codes */
const cache = new Map();
function cacheKey(tenantId, roleCode) {
    return `${tenantId}::${roleCode}`;
}
function getCached(tenantId, roleCode) {
    const entry = cache.get(cacheKey(tenantId, roleCode));
    if (!entry)
        return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        cache.delete(cacheKey(tenantId, roleCode));
        return null;
    }
    return entry.permissions;
}
function setCache(tenantId, roleCode, permissions) {
    cache.set(cacheKey(tenantId, roleCode), { permissions, cachedAt: Date.now() });
}
// ── Public API ──────────────────────────────────────────────────────────────
/**
 * Get all permission codes for a functional role from DB.
 * Results are cached for 5 minutes per tenant+role.
 */
async function getRolePermissionCodes(tenantId, roleCode) {
    const cached = getCached(tenantId, roleCode);
    if (cached)
        return cached;
    try {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const { rows } = await (0, db_1.safeQuery)(`SELECT DISTINCT p.permission_code
       FROM "${schema}".role_permissions rp
       JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
       JOIN "${schema}".permissions p ON p.permission_code = rp.permission_code
       WHERE fr.role_code = $1 AND p.is_active = TRUE AND fr.is_active = TRUE
       ORDER BY p.permission_code`, [roleCode]);
        const codes = rows.map((r) => r.permission_code);
        setCache(tenantId, roleCode, codes);
        return codes;
    }
    catch (err) {
        observability_1.logger.warn(`[RolePermissionLookup] Failed to load permissions for role "${roleCode}": ${err instanceof Error ? err.message : String(err)}`);
        return [];
    }
}
/**
 * Check if a role has a specific permission (DB-driven).
 */
async function hasRolePermission(tenantId, roleCode, permissionCode) {
    const codes = await getRolePermissionCodes(tenantId, roleCode);
    return codes.includes(permissionCode);
}
/**
 * Get all permission codes for multiple roles (union), useful for users with multiple roles.
 */
async function getEffectivePermissionCodes(tenantId, roleCodes) {
    const allPerms = new Set();
    for (const role of roleCodes) {
        const perms = await getRolePermissionCodes(tenantId, role);
        for (const p of perms)
            allPerms.add(p);
    }
    return Array.from(allPerms).sort();
}
/**
 * Invalidate cache for a tenant (call after role/permission changes).
 */
function invalidateRolePermissionCache(tenantId) {
    if (tenantId) {
        for (const key of cache.keys()) {
            if (key.startsWith(`${tenantId}::`))
                cache.delete(key);
        }
    }
    else {
        cache.clear();
    }
}
//# sourceMappingURL=role-permission-lookup.service.js.map