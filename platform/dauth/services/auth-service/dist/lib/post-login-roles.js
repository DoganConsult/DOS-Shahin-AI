"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserRoleAssignment = void 0;
const DEFAULT_FALLBACK_ROLE = 'standard_user';
const FOUNDER_ROLE = 'tenant_admin';
const PRIORITY = [
    'platform_admin',
    'tenant_owner',
    'tenant_admin',
    'org_admin',
    'hr_admin',
    'auditor',
    'viewer',
    'standard_user',
];
function pickPriorityRole(kcRoles, isFounder) {
    // Phase 18.1 — founder elevation: the user who just created a tenant via
    // /register becomes its tenant_admin automatically. tenant_owner stays a
    // deliberate human action (billing/legal transfer).
    if (isFounder)
        return FOUNDER_ROLE;
    const set = new Set(kcRoles.map((r) => r.toLowerCase()));
    for (const p of PRIORITY)
        if (set.has(p))
            return p;
    return DEFAULT_FALLBACK_ROLE;
}
/**
 * Ensure the user has at least one role assignment for the tenant. Returns
 * the role_code that was used (whether or not a row was newly inserted).
 */
async function ensureUserRoleAssignment(args) {
    const { pool, userSub, email, tenantId, kcRealmRoles, isFounder } = args;
    if (!userSub || !tenantId)
        return null;
    // 1. Already has assignments? Nothing to do.
    try {
        const existing = await pool.query(`SELECT 1 FROM dos.user_role_assignments
        WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`, [userSub, tenantId]);
        if ((existing.rowCount ?? 0) > 0)
            return null;
    }
    catch (e) {
        // Table missing or different shape — log and fall through to write attempt.
        console.warn('[post-login-roles] read existing failed', e.message);
        return null;
    }
    // 2. Pick role.
    const candidate = pickPriorityRole(kcRealmRoles, isFounder);
    // 3. Resolve to a known functional_roles row when possible.
    let roleCode = candidate;
    try {
        const r = await pool.query(`SELECT role_code FROM platform_dauth.functional_roles
        WHERE role_code = $1 LIMIT 1`, [candidate]);
        if ((r.rowCount ?? 0) === 0) {
            const fallback = await pool.query(`SELECT role_code FROM platform_dauth.functional_roles
          WHERE role_code = $1 LIMIT 1`, [DEFAULT_FALLBACK_ROLE]);
            if ((fallback.rowCount ?? 0) > 0)
                roleCode = DEFAULT_FALLBACK_ROLE;
        }
    }
    catch (e) {
        console.warn('[post-login-roles] role lookup failed', e.message);
    }
    // 4. Insert the assignment + sso identity row. Both ON CONFLICT DO NOTHING.
    try {
        const assignmentId = `pla_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        await pool.query(`INSERT INTO dos.user_role_assignments (assignment_id, user_id, tenant_id, role_code, granted_by, granted_at, is_active)
       VALUES ($1, $2, $3, $4, 'post-login-hook', NOW(), TRUE)
       ON CONFLICT DO NOTHING`, [assignmentId, userSub, tenantId, roleCode]);
    }
    catch (e) {
        console.warn('[post-login-roles] assignment insert failed', e.message);
    }
    try {
        await pool.query(`INSERT INTO dos.sso_identities (user_id, tenant_id, email, provider, external_subject, created_at)
       VALUES ($1, $2, $3, 'keycloak', $1, NOW())
       ON CONFLICT DO NOTHING`, [userSub, tenantId, email]);
    }
    catch (e) {
        // sso_identities may not exist on all envs — non-fatal.
    }
    return roleCode;
}
exports.ensureUserRoleAssignment = ensureUserRoleAssignment;
//# sourceMappingURL=post-login-roles.js.map