"use strict";
// ============================================
// DAuth — RBAC Data Seeder
// Seeds canonical roles, permissions, and mappings into a tenant
// schema during provisioning. Data-driven security (Law 3).
// Owner: DAuth
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSION_MAP = exports.CANONICAL_PERMISSIONS = exports.CANONICAL_ROLES = void 0;
exports.seedDynamicRbacData = seedDynamicRbacData;
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const decision_engine_1 = require("../decision-engine");
const db_2 = require("@dos/db");
const logger = (0, db_2.getDbLogger)();
// ── Import + re-export split modules (barrel) ────────────────────
// Importers of this file (dauth/index.ts, seed-rbac-data.test.ts)
// continue to work without changes.
const canonical_roles_1 = require("./canonical-roles");
Object.defineProperty(exports, "CANONICAL_ROLES", { enumerable: true, get: function () { return canonical_roles_1.CANONICAL_ROLES; } });
const canonical_permissions_1 = require("./canonical-permissions");
Object.defineProperty(exports, "CANONICAL_PERMISSIONS", { enumerable: true, get: function () { return canonical_permissions_1.CANONICAL_PERMISSIONS; } });
const role_permission_map_1 = require("./role-permission-map");
Object.defineProperty(exports, "ROLE_PERMISSION_MAP", { enumerable: true, get: function () { return role_permission_map_1.ROLE_PERMISSION_MAP; } });
const DEFAULT_ACCESS_PROFILES = [
    {
        code: 'platform_super_admin',
        name: 'Platform Super Admin Profile',
        description: 'Full platform access — all roles, all modules',
    },
    {
        code: 'tenant_admin',
        name: 'Tenant Admin Profile',
        description: 'Tenant administration — user management, module config, settings',
    },
    {
        code: 'standard_user',
        name: 'Standard User Profile',
        description: 'Default access — read-level access to assigned modules',
    },
    {
        code: 'viewer',
        name: 'Viewer Profile',
        description: 'Read-only access across enabled modules',
    },
];
// ── Seed entry point ───────────────────────────────────────────────
/**
 * Seeds the canonical RBAC data (roles, permissions, role->permission
 * mappings, and access profiles) into a tenant schema.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates on re-run.
 */
async function seedDynamicRbacData(tenantId) {
    const ts = (0, db_1.tenantSchema)(tenantId);
    let rolesSeeded = 0;
    let permissionsSeeded = 0;
    let mappingsSeeded = 0;
    const permModuleLookup = new Map();
    for (const p of canonical_permissions_1.CANONICAL_PERMISSIONS)
        permModuleLookup.set(p.code, p.module);
    try {
        // ── 0. Heal tenant membership rows (Step 3 prerequisite) ──────────────────
        // If a user belongs to this tenant in public.users but lacks an active row
        // in public.tenant_user_memberships, every requirePermission route will 403
        // at DAuth Step 3 — even ALWAYS_ON modules — regardless of role/permission state.
        // This upsert is idempotent and runs on every restart to heal stale rows.
        const tenantUsers = await (0, db_1.safeQuery)(`SELECT user_id, role FROM public.users
       WHERE tenant_id = $1 AND status != 'deleted'`, [tenantId]);
        for (const row of tenantUsers.rows) {
            const memberRole = (row.role === 'owner' || row.role === 'admin') ? row.role : 'member';
            await (0, db_1.safeQuery)(`INSERT INTO public.tenant_user_memberships
           (tenant_id, user_id, role, membership_type, is_tenant_owner, status, is_primary)
         VALUES ($1, $2, $3, 'internal', $4, 'active', TRUE)
         ON CONFLICT (user_id, tenant_id) DO UPDATE SET
           status     = 'active',
           updated_at = NOW()
         WHERE tenant_user_memberships.status != 'active'`, [tenantId, row.user_id, memberRole, memberRole === 'owner']);
        }
        if (tenantUsers.rows.length > 0) {
            logger.debug(`[DAuth] Membership heal: ${tenantUsers.rows.length} user(s) for tenant ${tenantId}`);
        }
        // ── 0b. Seed module entitlements if empty (Step 5 prerequisite) ───────
        // If the tenant schema's tenant_module_entitlements table has zero rows,
        // Step 5 of the decision engine will deny all non-ALWAYS_ON modules.
        // Seed all modules from CANONICAL_PERMISSIONS + GRC_CORE_MODULES.
        const entCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM "${ts}".tenant_module_entitlements LIMIT 1`);
        if (entCheck.rows.length === 0) {
            const allModules = new Set();
            for (const p of canonical_permissions_1.CANONICAL_PERMISSIONS)
                allModules.add(p.module);
            // Add core platform modules that may not have explicit permissions but must be entitled
            for (const m of ['foundation', 'governance', 'notification', 'profile', 'onboarding',
                'dashboard', 'workflow', 'admin', 'navigation', 'inbox', 'widgets', 'team', 'portals',
                'knowledge', 'records', 'integrations', 'analytics', 'reporting']) {
                allModules.add(m);
            }
            let entSeeded = 0;
            for (const moduleCode of allModules) {
                await (0, db_1.safeQuery)(`INSERT INTO "${ts}".tenant_module_entitlements
             (module_code, is_active, activated_at)
           VALUES ($1, TRUE, NOW())
           ON CONFLICT (module_code) DO NOTHING`, [moduleCode]);
                entSeeded++;
            }
            logger.info(`[DAuth] Entitlement seed: ${entSeeded} modules for tenant ${tenantId} (table was empty)`);
        }
        for (const role of canonical_roles_1.CANONICAL_ROLES) {
            const result = await (0, db_1.safeQuery)(`INSERT INTO "${ts}".roles (role_id, role_code, name_en, description_en, role_category, is_system, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'system', $5, true, NOW(), NOW())
         ON CONFLICT (role_code) DO NOTHING
         RETURNING role_id`, [(0, uuid_1.v4)(), role.code, role.name, role.description, role.isSystem]);
            if (result.rowCount && result.rowCount > 0)
                rolesSeeded++;
        }
        // ── 2. Seed permissions (post-163 enterprise schema: code, module_code, resource_code, action_code) ──
        for (const perm of canonical_permissions_1.CANONICAL_PERMISSIONS) {
            const result = await (0, db_1.safeQuery)(`INSERT INTO "${ts}".permissions (code, module_code, resource_code, action_code, description, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (code) DO NOTHING
         RETURNING id`, [perm.code, perm.module, perm.resource, perm.action, perm.name]);
            if (result.rowCount && result.rowCount > 0)
                permissionsSeeded++;
        }
        // ── 3. Seed role → permission mappings into role_permission_map (migration-412) ──
        for (const [roleCode, permCodes] of Object.entries(role_permission_map_1.ROLE_PERMISSION_MAP)) {
            for (const permCode of permCodes) {
                const moduleCode = permModuleLookup.get(permCode) || permCode.split('.')[0];
                const result = await (0, db_1.safeQuery)(`INSERT INTO "${ts}".role_permission_map (tenant_id, role_code, permission_code, module_code, granted_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (tenant_id, role_code, permission_code, module_code) DO UPDATE SET granted_at = NOW()`, [tenantId, roleCode, permCode, moduleCode]);
                if (result.rowCount && result.rowCount > 0)
                    mappingsSeeded++;
            }
        }
        // ── 4. Seed access profiles (post-163 enterprise schema) ──
        for (const profile of DEFAULT_ACCESS_PROFILES) {
            await (0, db_1.safeQuery)(`INSERT INTO "${ts}".access_profiles (code, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`, [profile.code, profile.name, profile.description]);
        }
        // ── 5. Post-seed invariant: verify mappings actually persisted ──
        const mapCheck = await (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${ts}".role_permission_map WHERE tenant_id = $1`, [tenantId]);
        const mapCount = mapCheck.rows[0]?.cnt ?? 0;
        if (mapCount === 0 && mappingsSeeded === 0) {
            (0, decision_engine_1.invalidatePermissionCache)(tenantId);
            const msg = `[DAuth] RBAC seed invariant FAILED: zero role_permission_map rows for tenant ${tenantId} — refusing to create a poisoned tenant`;
            logger.error(msg);
            throw new Error(msg);
        }
        logger.info(`[DAuth] RBAC seed complete for tenant ${tenantId}: ${rolesSeeded} roles, ${permissionsSeeded} permissions, ${mappingsSeeded} mappings (${mapCount} total in role_permission_map)`);
        (0, decision_engine_1.invalidatePermissionCache)(tenantId);
        return { rolesSeeded, permissionsSeeded, mappingsSeeded };
    }
    catch (err) {
        (0, decision_engine_1.invalidatePermissionCache)(tenantId);
        if (err instanceof Error && err.message.includes('RBAC seed invariant FAILED'))
            throw err;
        logger.error({
            error: err instanceof Error ? err.message : String(err),
            rolesSeeded, permissionsSeeded, mappingsSeeded,
        }, `[DAuth] RBAC seed FAILED for tenant ${tenantId}`);
        throw err;
    }
}
//# sourceMappingURL=seed-rbac-data.js.map