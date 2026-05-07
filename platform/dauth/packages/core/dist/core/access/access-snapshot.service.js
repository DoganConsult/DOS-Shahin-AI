"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessSnapshotService = void 0;
exports.getAccessSnapshot = getAccessSnapshot;
exports.provisionAccessFromRole = provisionAccessFromRole;
exports.canPerform = canPerform;
const observability_1 = require("@dos/platform-core/observability");
const db_1 = require("@dos/db");
const uuid_1 = require("uuid");
async function getAccessSnapshot(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const start = Date.now();
    const actor = { userId, email: '', displayName: '', actorType: 'human', identityPosture: 'password', mfaVerified: false };
    const tenant = { tenantId, tenantStatus: 'active', plan: 'standard', membershipStatus: 'active', membershipType: 'member', joinedAt: '' };
    let effectivePermissions = [];
    let accessProfiles = [];
    let functionalRoles = [];
    let decisionAuthorities = [];
    let allowedModules = [];
    let scopeBindings = [];
    // Parallelize all context fetching queries
    const [userResult, membershipResult, tenantResult, profilesResult, assignmentsResult, permissionsResult, authoritiesResult] = await Promise.all([
        // 1. Identity
        (0, db_1.safeQuery)(`SELECT email, COALESCE(first_name || ' ' || last_name, username, email) AS display_name
       FROM public.users WHERE user_id = $1 LIMIT 1`, [userId]).catch(() => ({ rows: [] })),
        // 2. Membership
        (0, db_1.safeQuery)(`SELECT status, membership_type, created_at FROM public.tenant_user_memberships
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`, [tenantId, userId]).catch(() => ({ rows: [] })),
        // 3. Tenant status
        (0, db_1.safeQuery)(`SELECT status, plan FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]).catch(() => ({ rows: [] })),
        // 4. Access Profiles
        (0, db_1.safeQuery)(`SELECT access_profile_code FROM "${schema}".user_access_profiles
       WHERE user_id = $1 AND is_active = TRUE`, [userId]).catch(() => ({ rows: [] })),
        // 5. Role Assignments & Modules
        (0, db_1.safeQuery)(`SELECT DISTINCT role_code, module_code, scope_type, scope_id
       FROM "${schema}".enterprise_user_role_assignments
       WHERE user_id = $1 AND is_active = TRUE
         AND (valid_to IS NULL OR valid_to > NOW())`, [userId]).catch(() => ({ rows: [] })),
        // 6. Permissions
        (0, db_1.safeQuery)(`SELECT DISTINCT rp.permission_code
       FROM "${schema}".enterprise_user_role_assignments ura
       JOIN "${schema}".role_permissions rp ON rp.role_id = ura.role_id
       WHERE ura.user_id = $1 AND ura.is_active = TRUE
         AND (ura.valid_to IS NULL OR ura.valid_to > NOW())`, [userId]).catch(() => ({ rows: [] })),
        // 7. Decision Authorities
        (0, db_1.safeQuery)(`SELECT DISTINCT authority_code FROM "${schema}".decision_authorities
       WHERE user_id = $1 AND is_active = TRUE`, [userId]).catch(() => ({ rows: [] }))
    ]);
    // Process User Identity
    if (userResult.rows[0]) {
        actor.email = userResult.rows[0].email || '';
        actor.displayName = userResult.rows[0].display_name || '';
    }
    // Process Membership
    if (membershipResult.rows[0]) {
        tenant.membershipStatus = membershipResult.rows[0].status;
        tenant.membershipType = membershipResult.rows[0].membership_type || 'member';
        tenant.joinedAt = membershipResult.rows[0].created_at?.toISOString?.() || '';
    }
    // Process Tenant
    if (tenantResult.rows[0]) {
        tenant.tenantStatus = tenantResult.rows[0].status || 'active';
        tenant.plan = tenantResult.rows[0].plan || 'standard';
    }
    // Process Access Profiles
    accessProfiles = profilesResult.rows.map((r) => r.access_profile_code).filter(Boolean);
    // Process Role Assignments & Modules
    const raRows = assignmentsResult.rows;
    functionalRoles = [...new Set(raRows.map((r) => r.role_code).filter(Boolean))];
    allowedModules = [...new Set(raRows.map((r) => r.module_code).filter(Boolean))];
    scopeBindings = raRows
        .filter((r) => r.scope_type && r.scope_id)
        .map((r) => ({ scopeType: r.scope_type, scopeId: String(r.scope_id), roleCode: String(r.role_code), inherited: false }));
    // Process Permissions
    effectivePermissions = permissionsResult.rows.map((r) => r.permission_code).filter(Boolean);
    // Process Authorities
    decisionAuthorities = authoritiesResult.rows.map((r) => r.authority_code).filter(Boolean);
    const isSuperAdmin = accessProfiles.includes('platform_super_admin');
    const duration = Date.now() - start;
    if (duration > 200) {
        observability_1.logger.warn(`[AccessSnapshot] Late snapshot for user ${userId} in tenant ${tenantId}: ${duration}ms`);
    }
    const auditTrace = {
        snapshotGeneratedAt: new Date().toISOString(),
        correlationId: (0, uuid_1.v4)(),
        cacheHit: false,
        evaluationDurationMs: duration,
    };
    return {
        actor,
        tenant,
        accessProfiles,
        functionalRoles,
        effectivePermissions,
        scopeBindings,
        decisionAuthorities,
        allowedModules,
        allowedProducts: [],
        allowedDashboards: [],
        // Landing hint: super-admins go to /admin (auth-boundary route).
        // Tenant-scoped users get null; SPA must read chrome.landingRoute
        // from /api/ui-os/workspace-runtime (DB-resolved). No fallback.
        landingHint: {
            landingPage: isSuperAdmin ? '/admin' : null,
            fallbackPage: null,
        },
        audit: auditTrace,
    };
}
async function resolveRoleMapping(schema, role) {
    const fallback = { accessProfile: 'restricted_viewer', functionalRoles: [] };
    try {
        const result = await (0, db_1.safeQuery)(`SELECT access_profile_code, functional_role_codes
       FROM "${schema}".role_profile_mappings
       WHERE legacy_role_code = $1 AND is_active = TRUE
       LIMIT 1`, [role]);
        if (result.rows[0]) {
            return {
                accessProfile: result.rows[0].access_profile_code || fallback.accessProfile,
                functionalRoles: result.rows[0].functional_role_codes || [],
            };
        }
    }
    catch (_e) { /* non-critical */ }
    try {
        const profileResult = await (0, db_1.safeQuery)(`SELECT profile_code FROM "${schema}".access_profiles
       WHERE profile_code = $1 AND is_active = TRUE LIMIT 1`, [role]);
        if (profileResult.rows[0]) {
            return { accessProfile: profileResult.rows[0].profile_code, functionalRoles: [] };
        }
    }
    catch (_e) { /* non-critical */ }
    return fallback;
}
async function provisionAccessFromRole(tenantId, userId, role, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const mapping = await resolveRoleMapping(schema, role);
    try {
        await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code, is_active, created_by)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT (user_id, access_profile_code) DO UPDATE SET is_active = TRUE, updated_at = NOW()`, [userId, mapping.accessProfile, actorId]);
    }
    catch (_e) { /* non-critical */ }
    for (const roleCode of mapping.functionalRoles) {
        try {
            await (0, db_1.safeQuery)(`INSERT INTO "${schema}".enterprise_user_role_assignments
           (user_id, role_code, is_active, created_by, valid_from)
         VALUES ($1, $2, TRUE, $3, NOW())
         ON CONFLICT DO NOTHING`, [userId, roleCode, actorId]);
        }
        catch (_e) { /* non-critical */ }
    }
}
async function canPerform(tenantId, userId, permissionCode) {
    const snapshot = await getAccessSnapshot(tenantId, userId);
    return snapshot.effectivePermissions.includes(permissionCode);
}
exports.accessSnapshotService = {
    getUserAuthzPayload: getAccessSnapshot,
    provisionFromLegacyRole: provisionAccessFromRole,
    can: canPerform,
};
//# sourceMappingURL=access-snapshot.service.js.map