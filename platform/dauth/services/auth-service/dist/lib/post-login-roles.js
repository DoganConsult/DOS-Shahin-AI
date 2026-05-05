"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserRoleAssignment = void 0;
const openfga_1 = require("./openfga");
const TENANT_ADMIN_ROLE = 'tenant_admin';
const PLATFORM_ADMIN_ROLE = 'platform_admin';
/**
 * Platform-admin email allow-list. Direct PaaS access is restricted to a
 * small operator set; everyone else self-registering becomes tenant_admin
 * for their own tenant. Sourced from PLATFORM_ADMIN_EMAILS (CSV) with the
 * two canonical operators as the fallback so production stays correct
 * even when the env override is unset.
 */
function platformAdminEmails() {
    const csv = (process.env.PLATFORM_ADMIN_EMAILS || '').trim();
    const raw = csv === ''
        ? ['doganlap@gmail.com', 'ahmet.dogan@doganconsult.com']
        : csv.split(',').map((s) => s.trim()).filter(Boolean);
    return new Set(raw.map((s) => s.toLowerCase()));
}
/**
 * Dynamic-only role rule:
 *   - email ∈ PLATFORM_ADMIN_EMAILS → platform_admin (direct PaaS access).
 *   - otherwise → tenant_admin (self-register founder always owns the
 *     tenant they just created).
 * KC realm-role priority lookup is intentionally removed — the role is
 * decided by the email allow-list + the founder fact, never by external
 * KC realm metadata.
 */
function pickPriorityRole(email) {
    return platformAdminEmails().has(email.toLowerCase())
        ? PLATFORM_ADMIN_ROLE
        : TENANT_ADMIN_ROLE;
}
/**
 * Ensure the user has at least one role assignment for the tenant. Returns
 * the role_code that was used (whether or not a row was newly inserted).
 */
async function ensureUserRoleAssignment(args) {
    const { pool, userSub, email, tenantId } = args;
    if (!userSub || !tenantId)
        return null;
    // 1. Already has assignments? Seed FGA tuples (idempotent) and exit.
    try {
        const existing = await pool.query(`SELECT role_code FROM dos.user_role_assignments
        WHERE user_id = $1 AND tenant_id = $2 AND is_active = TRUE
        ORDER BY granted_at DESC LIMIT 1`, [userSub, tenantId]);
        if ((existing.rowCount ?? 0) > 0) {
            const role = existing.rows[0].role_code;
            await (0, openfga_1.writeLoginTuples)({ userSub, tenantId, role });
            return role;
        }
    }
    catch (e) {
        console.warn('[post-login-roles] read existing failed', e.message);
        return null;
    }
    // 2. Pick role — dynamic email-allow-list rule. Self-register users
    //    always become tenant_admin for their own tenant; platform admins
    //    are the small allow-listed operator set.
    const candidate = pickPriorityRole(email);
    // 3. Resolve to a known functional_roles row when possible. The dynamic
    //    rule only emits two role_codes (platform_admin / tenant_admin) and
    //    both exist in the canonical functional_roles seed; if one is
    //    missing we still write the row — RLS / permission lookup will
    //    surface the missing-role error rather than silently downgrade.
    let roleCode = candidate;
    try {
        await pool.query(`SELECT role_code FROM platform_dauth.functional_roles WHERE role_code = $1 LIMIT 1`, [candidate]);
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
    // 5. Seed canonical OpenFGA tuples for the user/tenant pair. Always
    //    writes the baseline (user:<sub>, member, tenant:<id>); when the
    //    role resolves to tenant_admin / platform_admin we additionally
    //    emit the matching admin tuple. Idempotent on re-login.
    await (0, openfga_1.writeLoginTuples)({ userSub, tenantId, role: roleCode });
    return roleCode;
}
exports.ensureUserRoleAssignment = ensureUserRoleAssignment;
//# sourceMappingURL=post-login-roles.js.map