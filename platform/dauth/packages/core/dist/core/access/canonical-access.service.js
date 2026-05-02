"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateSnapshotCache = invalidateSnapshotCache;
exports.clearSnapshotCache = clearSnapshotCache;
exports.getCachedBootstrapData = getCachedBootstrapData;
exports.resolveAccessSnapshot = resolveAccessSnapshot;
// @deprecated @removal-date 2026-09-30 | @owner DAuth | @replacement platform/dauth/access/access-snapshot.service.ts
// Backward-compat adapter. Delegates authz resolution to access-snapshot.service (canonical engine, Law 1).
// Wrong-layer import from modules/admin (enterprise-authz) removed — replaced by accessSnapshotService.
// BootstrapService cross-layer import retained under approved bridge until Phase 7 bootstrap migration.
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
const modules_1 = require("@dos/platform-core/modules");
const access_snapshot_service_1 = require("./access-snapshot.service");
const observability_1 = require("@dos/platform-core/observability");
const canonical_access_types_1 = require("./canonical-access.types");
const SNAPSHOT_CACHE_TTL = 30_000;
const snapshotCache = new Map();
const bootstrapDataCache = new Map();
function cacheKey(userId, tenantId) {
    return `${userId}:${tenantId}`;
}
function invalidateSnapshotCache(userId, tenantId) {
    if (tenantId) {
        const k = cacheKey(userId, tenantId);
        snapshotCache.delete(k);
        bootstrapDataCache.delete(k);
    }
    else {
        for (const key of snapshotCache.keys()) {
            if (key.startsWith(`${userId}:`))
                snapshotCache.delete(key);
        }
        for (const key of bootstrapDataCache.keys()) {
            if (key.startsWith(`${userId}:`))
                bootstrapDataCache.delete(key);
        }
    }
}
function clearSnapshotCache() {
    snapshotCache.clear();
    bootstrapDataCache.clear();
}
function getCachedBootstrapData(userId, tenantId) {
    const entry = bootstrapDataCache.get(cacheKey(userId, tenantId));
    if (entry && entry.expiresAt > Date.now())
        return entry.data;
    return null;
}
async function resolveAccessSnapshot(userId, tenantId, opts) {
    const key = cacheKey(userId, tenantId);
    const cached = snapshotCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }
    const resolverErrors = [];
    let resolverStatus = 'ok';
    const userResult = await (0, db_1.safeQuery)(`SELECT user_id, email, name, full_name, role, status, is_super_admin, onboarding_complete
     FROM public.users WHERE user_id = $1 LIMIT 1`, [userId]);
    const user = (0, db_2.getFirstRow)(userResult);
    if (!user) {
        throw new canonical_access_types_1.AccessResolverError('User not found', 401, 'USER_NOT_FOUND');
    }
    const userStatus = (user.status || 'active').toLowerCase();
    if (userStatus === 'suspended') {
        throw new canonical_access_types_1.AccessResolverError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
    }
    if (userStatus === 'inactive' || userStatus === 'deactivated') {
        throw new canonical_access_types_1.AccessResolverError('Account inactive', 403, 'ACCOUNT_INACTIVE');
    }
    const tenantResult = await (0, db_1.safeQuery)(`SELECT tenant_id, org_name, status FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    const tenant = (0, db_2.getFirstRow)(tenantResult);
    if (!tenant) {
        throw new canonical_access_types_1.AccessResolverError('Tenant not found', 401, 'TENANT_NOT_FOUND');
    }
    const tenantStatus = (tenant.status || 'active').toLowerCase();
    if (tenantStatus === 'suspended' || tenantStatus === 'deleted') {
        throw new canonical_access_types_1.AccessResolverError('Tenant suspended', 403, 'TENANT_SUSPENDED');
    }
    let membership = null;
    try {
        const memberResult = await (0, db_1.safeQuery)(`SELECT role, is_primary FROM public.tenant_user_memberships
       WHERE user_id = $1 AND tenant_id = $2 AND COALESCE(status, 'active') = 'active'
       ORDER BY is_primary DESC LIMIT 1`, [userId, tenantId]);
        const row = (0, db_2.getFirstRow)(memberResult);
        if (row) {
            membership = { role: row.role, isPrimary: row.is_primary === true };
        }
    }
    catch {
        resolverErrors.push('tenant_membership');
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    let productEntitlements = [];
    try {
        const entResult = await (0, db_1.safeQuery)(`SELECT product_code, licensed_modules
       FROM "${schema}".product_user_entitlements
       WHERE user_id = $1 AND is_active = TRUE`, [userId]);
        productEntitlements = entResult.rows.map((r) => ({
            productCode: r.product_code,
            licensedModules: Array.isArray(r.licensed_modules) ? r.licensed_modules : [],
        }));
    }
    catch {
        resolverErrors.push('product_entitlements');
    }
    let effectiveModules = [];
    try {
        const result = await (0, modules_1.getEffectiveModules)(tenantId, userId);
        effectiveModules = result.modules;
    }
    catch (err) {
        resolverErrors.push('effective_modules');
        observability_1.logger.warn('[CanonicalAccess] getEffectiveModules failed:', err);
    }
    let authzPermissions = [];
    let authzScopes = [];
    let authzFunctionalRoles = [];
    let authzAccessProfiles = [];
    try {
        const raw = await access_snapshot_service_1.accessSnapshotService.getUserAuthzPayload(tenantId, userId);
        const payload = raw;
        authzPermissions = payload.permissions ?? payload.effectivePermissions ?? [];
        authzScopes = (payload.scopes ?? []);
        authzFunctionalRoles = payload.functionalRoles ?? [];
        authzAccessProfiles = payload.accessProfiles ?? [];
    }
    catch {
        resolverErrors.push('enterprise_authz');
    }
    let landingPage = '/workspace-home';
    let dashboardWidgets = [];
    let defaultDashboard = null;
    try {
        // Decoupled BootstrapService per Law 15. The UI calls /api/me/bootstrap independently.
        // We provide basic defaults here to satisfy snapshot interfaces without reverse imports.
        landingPage = '/workspace-home';
        dashboardWidgets = [];
        defaultDashboard = null;
    }
    catch {
        // legacy block, kept strictly structured
    }
    if (resolverErrors.length > 0) {
        const critical = resolverErrors.filter(e => e === 'effective_modules' || e === 'enterprise_authz');
        if (critical.length >= 2) {
            resolverStatus = 'failed';
        }
        else if (critical.length === 1) {
            resolverStatus = 'partial';
        }
    }
    const platformRole = user.role || 'user';
    const isSuperAdmin = user.is_super_admin === true;
    const platformRoles = [platformRole];
    if (isSuperAdmin && !platformRoles.includes('super_admin')) {
        platformRoles.push('super_admin');
    }
    const tenantRoles = [];
    if (membership?.role)
        tenantRoles.push(membership.role);
    if (platformRole && !tenantRoles.includes(platformRole))
        tenantRoles.push(platformRole);
    const visibleProducts = productEntitlements.length > 0
        ? [...new Set(productEntitlements.map(e => e.productCode))]
        : ['shahin-ai'];
    const workspaceCanAccess = effectiveModules.includes('workspace') ||
        isSuperAdmin ||
        authzAccessProfiles.some(p => p === 'platform_super_admin' || p === 'tenant_admin');
    if (resolverStatus === 'ok' &&
        authzPermissions.length === 0 &&
        effectiveModules.length === 0 &&
        !isSuperAdmin &&
        authzAccessProfiles.length === 0 &&
        authzFunctionalRoles.length === 0) {
        throw new canonical_access_types_1.AccessResolverError('No access', 403, 'NO_ACCESS');
    }
    const snapshot = {
        version: new Date().toISOString(),
        resolverStatus,
        resolverErrors,
        identity: { userId, tenantId, sessionId: opts?.sessionId ?? null },
        platform: {
            isActive: true,
            isSuperAdmin,
            accountStatus: userStatus,
            activeSessions: 0,
        },
        tenant: {
            tenantId,
            tenantStatus,
            orgName: tenant.org_name || null,
            membership,
        },
        access: {
            platformRoles,
            tenantRoles,
            accessProfiles: authzAccessProfiles,
            functionalRoles: authzFunctionalRoles,
            permissions: authzPermissions,
            scopes: authzScopes,
        },
        products: {
            visibleProducts,
            visibleModules: effectiveModules,
        },
        workspace: {
            canAccess: workspaceCanAccess,
            defaultDashboard,
        },
        nav: {
            landingPage,
            dashboardWidgets,
        },
    };
    snapshotCache.set(key, { data: snapshot, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL });
    return snapshot;
}
//# sourceMappingURL=canonical-access.service.js.map