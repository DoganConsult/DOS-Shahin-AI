"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePrincipalMinimal = resolvePrincipalMinimal;
exports.resolvePrincipalByEmail = resolvePrincipalByEmail;
exports.validateTenantMembership = validateTenantMembership;
exports.isPrincipalActive = isPrincipalActive;
exports.updateLastLogin = updateLastLogin;
exports.createIdentity = createIdentity;
const db_1 = require("@dos/db");
const decision_log_service_1 = require("../audit/decision-log.service");
const platform_core_1 = require("@dos/platform-core");
const resilience_1 = require("@dos/platform-core/resilience");
async function resolvePrincipalMinimal(userId) {
    const result = await (0, db_1.safeQuery)(`SELECT user_id, email, tenant_id, role, status, name, language,
            COALESCE((SELECT TRUE FROM user_mfa WHERE user_id = u.user_id AND enabled = TRUE LIMIT 1), FALSE) AS mfa_enabled,
            last_login_at
     FROM users u WHERE user_id = $1 LIMIT 1`, [userId]);
    if (!result.rows.length)
        return null;
    const row = result.rows[0];
    return {
        userId: row.user_id,
        email: row.email,
        tenantId: row.tenant_id,
        role: row.role,
        status: (row.status || 'active'),
        principalType: 'human',
        name: row.name,
        language: row.language,
        mfaEnabled: row.mfa_enabled === true,
        lastLoginAt: row.last_login_at,
    };
}
async function resolvePrincipalByEmail(email) {
    const result = await (0, db_1.safeQuery)(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
    if (!result.rows.length)
        return null;
    return resolvePrincipalMinimal(result.rows[0].user_id);
}
async function validateTenantMembership(userId, tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT 1 FROM tenant_user_memberships
     WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`, [userId, tenantId]);
    return result.rows.length > 0;
}
async function isPrincipalActive(userId) {
    const principal = await resolvePrincipalMinimal(userId);
    return principal?.status === 'active';
}
async function updateLastLogin(userId) {
    await (0, db_1.safeQuery)(`UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE user_id = $1`, [userId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function createIdentity(input, txClient) {
    const exec = txClient ? txClient.query.bind(txClient) : (sql, params) => (0, db_1.query)(sql, params);
    const existing = await exec('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [input.email]);
    if (existing.rows.length > 0) {
        throw new Error('IDENTITY_ALREADY_EXISTS');
    }
    await exec(`INSERT INTO users (user_id, email, password_hash, name, full_name, tenant_id, role, user_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
        input.userId,
        input.email.trim().toLowerCase(),
        input.passwordHash,
        input.name,
        input.name,
        input.tenantId,
        input.role,
        input.userType || 'internal',
        input.status || 'active',
    ]);
    if (input.tenantId) {
        const normalizedRole = String(input.role || '').toLowerCase();
        const ownerRoles = new Set(['owner', 'admin', 'tenant_admin', 'platform_admin', 'super_admin']);
        const adminRoles = new Set(['admin', 'tenant_admin', 'platform_admin', 'super_admin']);
        const isOwner = ownerRoles.has(normalizedRole);
        const mRole = normalizedRole === 'owner' ? 'owner' : (adminRoles.has(normalizedRole) ? 'admin' : 'member');
        await exec(`INSERT INTO tenant_user_memberships
         (user_id, tenant_id, role, membership_type, is_tenant_owner, status, is_primary)
       VALUES ($1, $2, $3, 'internal', $4, 'active', TRUE)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         role = CASE WHEN tenant_user_memberships.status = 'active' THEN tenant_user_memberships.role ELSE EXCLUDED.role END,
         status = 'active',
         updated_at = NOW()
       WHERE tenant_user_memberships.status != 'active'`, [input.userId, input.tenantId, mRole, isOwner]);
    }
    await (0, decision_log_service_1.logAuthDecision)(input.tenantId || platform_core_1.SYSTEM_TENANT, {
        userId: input.userId,
        permissionCode: 'identity.create',
        decision: 'allow',
        reason: 'Identity created via DAuth identity service',
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return {
        userId: input.userId,
        email: input.email.trim().toLowerCase(),
        tenantId: input.tenantId,
        role: input.role,
        status: (input.status || 'active'),
        principalType: 'human',
        name: input.name,
        mfaEnabled: false,
        lastLoginAt: null,
    };
}
//# sourceMappingURL=identity.service.js.map