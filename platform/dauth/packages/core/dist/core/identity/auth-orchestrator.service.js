"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCredentials = authenticateCredentials;
exports.lookupUserByEmail = lookupUserByEmail;
exports.resolveUserRoles = resolveUserRoles;
exports.resolveUserRole = resolveUserRole;
exports.issueLoginTokens = issueLoginTokens;
exports.buildLoginResponse = buildLoginResponse;
exports.handleMfaChallenge = handleMfaChallenge;
exports.completeMfaLogin = completeMfaLogin;
exports.changePassword = changePassword;
exports.resolveOrgName = resolveOrgName;
exports.resolveLoginBootstrapData = resolveLoginBootstrapData;
exports.resolveTenantMemberships = resolveTenantMemberships;
exports.resolveEnterpriseAuthz = resolveEnterpriseAuthz;
exports.resolveOnboardingSessionId = resolveOnboardingSessionId;
exports.checkMfaEnabled = checkMfaEnabled;
exports.recordLoginTimestamp = recordLoginTimestamp;
exports.checkAccountStatus = checkAccountStatus;
exports.buildMustChangePasswordResponse = buildMustChangePasswordResponse;
exports.emitLoginSuccess = emitLoginSuccess;
exports.emitLoginFailure = emitLoginFailure;
exports.emitRegistration = emitRegistration;
/**
 * DAuth Auth Orchestrator — canonical auth flow coordination.
 *
 * Extracts DAuth-owned authentication orchestration from route handlers
 * into reusable service functions that delegate to existing DAuth services.
 *
 * Law 2: One canonical owner per concern — auth orchestration belongs to DAuth.
 * Law 9: Organized by concern (dauth/identity/), not implementation pattern.
 */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const observability_1 = require("@dos/platform-core/observability");
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const token_service_1 = require("./token.service");
const token_blacklist_service_1 = require("../session/token-blacklist.service");
const decision_log_service_1 = require("../audit/decision-log.service");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const platform_core_1 = require("@dos/platform-core");
const mfa_service_1 = require("../mfa/mfa.service");
const platform_core_2 = require("@dos/platform-core");
const resilience_1 = require("@dos/platform-core/resilience");
const dauth_config_1 = require("../dauth.config");
const LOGIN_CONTEXT_TIMEOUT_MS = dauth_config_1.DAUTH_CONFIG.loginContextTimeoutMs;
const OPTIONAL_AUTHZ_TIMEOUT_MS = dauth_config_1.DAUTH_CONFIG.optionalAuthzTimeoutMs;
// ── 1. authenticateCredentials ──
/**
 * Look up user by email, verify password with bcrypt.
 * Returns user row or null if credentials are invalid.
 * Does NOT record login attempts — caller handles that based on result.
 */
async function authenticateCredentials(email, password) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`, [email]);
    const user = result.rows[0];
    if (!user) {
        observability_1.logger.info('[AuthOrchestrator] authenticateCredentials: no user found', { email: email.substring(0, 3) + '***' });
        return null;
    }
    const passwordValid = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!passwordValid) {
        observability_1.logger.info('[AuthOrchestrator] authenticateCredentials: invalid password', { userId: user.user_id });
        return null;
    }
    observability_1.logger.info('[AuthOrchestrator] authenticateCredentials: success', { userId: user.user_id, tenantId: user.tenant_id });
    return buildUserFromRow(user);
}
/**
 * Look up a user by email without verifying password.
 * Used for anti-enumeration: we need to know if user exists to record failed attempts.
 */
async function lookupUserByEmail(email) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`, [email]);
    const user = result.rows[0];
    if (!user)
        return null;
    return buildUserFromRow(user);
}
function buildUserFromRow(row) {
    return {
        user_id: row.user_id,
        email: row.email,
        tenant_id: row.tenant_id,
        role: row.role || 'user',
        name: row.name || '',
        status: (row.status || 'active').toLowerCase(),
        onboarding_complete: row.onboarding_complete ?? false,
        member_onboarded: row.member_onboarded === true,
        is_super_admin: row.is_super_admin === true,
        must_change_password: row.must_change_password === true,
    };
}
// ── 2. resolveUserRoles ──
/**
 * Query roles from tenant schema for a user. Falls back to the user's base role.
 */
async function resolveUserRoles(userId, tenantId, fallbackRole) {
    try {
        const schema = `tenant_${tenantId}`;
        const result = await (0, db_1.safeQuery)(`SELECT DISTINCT r.role_code FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".roles r ON r.role_id = ura.role_id
       WHERE ura.user_id = $1 AND COALESCE(ura.is_active, ura.active) = TRUE AND r.active = TRUE
       ORDER BY r.role_code`, [userId]);
        if (result.rows.length > 0) {
            return result.rows.map((r) => r.role_code);
        }
        return [fallbackRole];
    }
    catch {
        return [fallbackRole];
    }
}
/**
 * Resolve a single effective role (first from roles list).
 */
async function resolveUserRole(userId, tenantId, fallbackRole) {
    const roles = await resolveUserRoles(userId, tenantId, fallbackRole);
    return roles[0] || fallbackRole;
}
// ── 3. issueLoginTokens ──
/**
 * Generate access + refresh tokens, persist session, register JTI.
 * Returns the token pair and the access JTI.
 */
async function issueLoginTokens(user, effectiveRole, rememberMe, ip, userAgent) {
    const accessToken = (0, token_service_1.generateAccessToken)({
        userId: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        role: effectiveRole,
        role_code: effectiveRole,
        is_super_admin: user.is_super_admin === true,
    });
    const refreshToken = (0, token_service_1.generateRefreshToken)(user.user_id, user.tenant_id, rememberMe);
    const dec = (0, token_service_1.decodeTokenUnsafe)(accessToken);
    const refreshDec = (0, token_service_1.decodeTokenUnsafe)(refreshToken);
    // Register JTI for active session tracking
    if (dec?.jti) {
        await (0, token_blacklist_service_1.registerActiveJtiForUser)(user.user_id, dec.jti, (0, token_service_1.getAccessTokenExpirySeconds)()).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    // Persist session to DB for revocation tracking (DAuth canonical session)
    try {
        await (0, db_1.safeQuery)(`INSERT INTO sessions (session_id, user_id, tenant_id, jti, refresh_jti, ip_address, user_agent, created_at, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
       ON CONFLICT DO NOTHING`, [
            (0, uuid_1.v4)(),
            user.user_id,
            user.tenant_id,
            dec?.jti ?? null,
            refreshDec?.jti ?? null,
            ip,
            userAgent,
            new Date(Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 3600 * 1000)),
        ]);
    }
    catch {
        // Non-blocking — session persistence failure should not prevent login
    }
    observability_1.logger.info('[AuthOrchestrator] issueLoginTokens: tokens issued', { userId: user.user_id, tenantId: user.tenant_id, role: effectiveRole, jti: dec?.jti });
    return {
        accessToken,
        refreshToken,
        accessJti: dec?.jti,
    };
}
// ── 4. buildLoginResponse ──
/**
 * Build the standard login response object.
 * All deprecated fields are preserved for backward compatibility.
 */
function buildLoginResponse(user, token, allRoles, effectiveRole, enterpriseAuthz, sessionId, orgName, tenantMemberships, sessionIdleTimeoutMinutes) {
    const response = {
        token,
        userId: user.user_id,
        tenantId: user.tenant_id,
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot */
        role: effectiveRole,
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot */
        roles: allRoles,
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /identity/users/:id/canonical-profile */
        onboardingComplete: user.onboarding_complete,
        memberOnboarded: user.member_onboarded,
        orgName,
        userName: user.name || '',
        isSuperAdmin: user.is_super_admin === true,
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot */
        // Landing route owned by dos.tenant_landing_config (UI-OS resolver).
        // Bootstrap response no longer fabricates a default — null forces
        // SPA empty/no-op state.
        tenantLandingRoute: null,
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot navigation.visibleModules */
        roleModules: [],
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot navigation.dashboardWidgets */
        dashboardWidgets: [],
        _moduleAuthority: 'bootstrap',
        /** @deprecated @removal-date Phase 2 (DAuth access core) @owner DAuth @replacement /api/me/access-snapshot */
        enterpriseAuthz,
        sessionId,
    };
    if (sessionIdleTimeoutMinutes !== undefined) {
        response.sessionIdleTimeoutMinutes = sessionIdleTimeoutMinutes;
    }
    if (tenantMemberships.length > 1) {
        response.tenantMemberships = tenantMemberships;
    }
    return response;
}
// ── 5. handleMfaChallenge ──
/**
 * Create an MFA challenge for a user with MFA enabled.
 * For email MFA, generates a code (caller is responsible for sending it).
 * Returns the MFA challenge response and the email code (if email MFA).
 */
async function handleMfaChallenge(user, mfaRecord) {
    let emailCode;
    if (mfaRecord.mfa_type === 'email') {
        const { code } = await (0, mfa_service_1.createEmailChallenge)(user.user_id, user.tenant_id);
        emailCode = code;
    }
    const response = {
        mfaRequired: true,
        mfaType: mfaRecord.mfa_type,
        userId: user.user_id,
        message: mfaRecord.mfa_type === 'email'
            ? 'A verification code has been sent to your email.'
            : 'Enter the code from your authenticator app.',
    };
    observability_1.logger.info('[AuthOrchestrator] handleMfaChallenge: challenge created', { userId: user.user_id, mfaType: mfaRecord.mfa_type });
    return { response, emailCode };
}
// ── 6. completeMfaLogin ──
/**
 * After MFA verification, fetch user, resolve roles, issue tokens, build response.
 * MFA code verification itself is done by the caller (route handler) since it
 * needs access to auth-enhanced.service verifyTOTP which is a product-layer function.
 *
 * This function handles the post-verification flow:
 * look up user, check status, resolve roles, fetch context, issue tokens, build response.
 */
async function completeMfaLogin(userId, rememberMe, ip, userAgent) {
    const userResult = await (0, db_1.safeQuery)('SELECT user_id, email, tenant_id, role, name, status, onboarding_complete, is_super_admin, member_onboarded, must_change_password FROM users WHERE user_id = $1', [userId]);
    if (!userResult.rows.length)
        return null;
    const row = userResult.rows[0];
    const user = buildUserFromRow(row);
    // Status checks — caller should interpret and return appropriate HTTP response
    if (user.status === 'suspended' || user.status === 'inactive' || user.status === 'deactivated') {
        return { user, tokens: null, allRoles: [], effectiveRole: '', orgName: '', tenantMemberships: [], enterpriseAuthz: null, sessionId: null };
    }
    const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    const { orgName, tenantMemberships, enterpriseAuthz, sessionId } = await resolveLoginBootstrapData(user.tenant_id, user.user_id, user.onboarding_complete);
    const tokens = await issueLoginTokens(user, effectiveRole, rememberMe, ip, userAgent);
    observability_1.logger.info('[AuthOrchestrator] completeMfaLogin: MFA login completed', { userId, tenantId: user.tenant_id, role: effectiveRole });
    return { user, tokens, allRoles, effectiveRole, orgName, tenantMemberships, enterpriseAuthz, sessionId };
}
// ── 7. changePassword ──
/**
 * Validate current password, enforce password policy, hash new password, update DB, issue new tokens.
 */
async function changePassword(userId, tenantId, currentPassword, newPassword, minLength, bcryptRounds) {
    // Validate password policy
    if (newPassword.length < minLength) {
        return { success: false, error: 'WEAK_PASSWORD', statusCode: 400 };
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
        return { success: false, error: 'WEAK_PASSWORD', statusCode: 400 };
    }
    // Fetch user and verify current password
    const userRes = await (0, db_1.safeQuery)(`SELECT password_hash, email, role FROM users WHERE user_id = $1`, [userId]);
    if (!userRes.rows.length) {
        return { success: false, error: 'NOT_FOUND', statusCode: 404 };
    }
    const user = userRes.rows[0];
    const valid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
    if (!valid) {
        return { success: false, error: 'INVALID_CREDENTIALS', statusCode: 401 };
    }
    // Hash and update
    const hash = await bcryptjs_1.default.hash(newPassword, bcryptRounds);
    await (0, db_1.safeQuery)(`UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE user_id = $2`, [hash, userId]);
    observability_1.logger.info('[AuthOrchestrator] changePassword: password updated', { userId, tenantId });
    // Issue new token
    const newToken = (0, token_service_1.generateAccessToken)({
        userId,
        email: user.email || '',
        tenantId,
        role: user.role || 'user',
        role_code: user.role || 'user',
    });
    await (0, decision_log_service_1.logAuthDecision)(tenantId, {
        userId,
        permissionCode: 'identity.change_password',
        decision: 'allow',
        reason: 'Password changed successfully',
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return { success: true, token: newToken };
}
// ── Shared helpers (used by login, MFA login, refresh flows) ──
/**
 * Resolve organization name from tenant ID.
 */
async function resolveOrgName(tenantId) {
    try {
        const tenantResult = await (0, db_1.safeQuery)('SELECT org_name FROM tenants WHERE tenant_id = $1', [tenantId]);
        const row = tenantResult.rows[0];
        return row?.org_name || '';
    }
    catch {
        return '';
    }
}
async function resolveLoginBootstrapData(tenantId, userId, onboardingComplete) {
    const [orgName, tenantMemberships, sessionId, enterpriseAuthz] = await Promise.all([
        (0, platform_core_1.withTimeout)(() => resolveOrgName(tenantId), LOGIN_CONTEXT_TIMEOUT_MS).catch(() => ''),
        (0, platform_core_1.withTimeout)(() => resolveTenantMemberships(userId), LOGIN_CONTEXT_TIMEOUT_MS).catch(() => []),
        (0, platform_core_1.withTimeout)(() => resolveOnboardingSessionId(userId, onboardingComplete), LOGIN_CONTEXT_TIMEOUT_MS).catch((_err) => null),
        (0, platform_core_1.withTimeout)(() => resolveEnterpriseAuthz(tenantId, userId), OPTIONAL_AUTHZ_TIMEOUT_MS).catch((_err) => null),
    ]);
    return { orgName, tenantMemberships, enterpriseAuthz, sessionId };
}
/**
 * Resolve tenant memberships for multi-tenant users.
 */
async function resolveTenantMemberships(userId) {
    try {
        const result = await (0, db_1.safeQuery)(`SELECT tum.tenant_id, tum.role, tum.is_primary, t.org_name
       FROM tenant_user_memberships tum
       JOIN tenants t ON t.tenant_id = tum.tenant_id
       WHERE tum.user_id = $1 AND COALESCE(tum.status, 'active') = 'active'
       ORDER BY tum.is_primary DESC, tum.joined_at ASC`, [userId]);
        return result.rows.map((r) => ({
            tenantId: r.tenant_id,
            role: r.role,
            isPrimary: r.is_primary,
            orgName: r.org_name || '',
        }));
    }
    catch {
        return [];
    }
}
/**
 * Resolve enterprise authorization snapshot for a user.
 */
async function resolveEnterpriseAuthz(tenantId, userId) {
    try {
        // Lazy import to avoid circular dependency
        const { accessSnapshotService } = await import('../access/access-snapshot.service.js');
        return (await accessSnapshotService.getUserAuthzPayload(tenantId, userId));
    }
    catch {
        return null;
    }
}
/**
 * Resolve an active onboarding session ID for incomplete onboarding.
 */
async function resolveOnboardingSessionId(userId, onboardingComplete) {
    if (onboardingComplete)
        return null;
    try {
        const result = await (0, db_1.safeQuery)(`SELECT id FROM public.onboarding_sessions
       WHERE started_by_user_id = $1 AND status NOT IN ('completed','cancelled')
       ORDER BY created_at DESC LIMIT 1`, [userId]);
        const row = result.rows[0];
        return row?.id ?? null;
    }
    catch {
        return null;
    }
}
/**
 * Check if MFA is enabled for a user. Returns the MFA record or null.
 */
async function checkMfaEnabled(userId) {
    try {
        const result = await (0, db_1.safeQuery)(`SELECT mfa_type, enabled FROM user_mfa WHERE user_id = $1 AND enabled = TRUE`, [userId]);
        return result.rows[0] || null;
    }
    catch {
        return null;
    }
}
/**
 * Update last login timestamp and increment login count.
 */
async function recordLoginTimestamp(email) {
    await (0, db_1.safeQuery)('UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE LOWER(email) = LOWER($1)', [email]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
/**
 * Check user account status. Returns null if OK, or the status string if blocked.
 */
function checkAccountStatus(status) {
    const s = status.toLowerCase();
    if (s === 'suspended')
        return 'suspended';
    if (s === 'inactive' || s === 'deactivated')
        return 'inactive';
    return null;
}
/**
 * Build must-change-password response (temporary token, no full login).
 */
function buildMustChangePasswordResponse(user) {
    const tempToken = (0, token_service_1.generateAccessToken)({
        userId: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role,
        role_code: user.role,
        mustChangePassword: true,
    });
    return {
        mustChangePassword: true,
        token: tempToken,
        userId: user.user_id,
        tenantId: user.tenant_id,
        role: user.role,
        message: 'Password change required before access is granted.',
    };
}
// ── DAuth Domain Events ──
async function emitLoginSuccess(tenantId, userId, ip, mfa) {
    await (0, publish_with_dsoc_1.publish)('dauth.login.success', tenantId, {
        userId,
        ip,
        mfa,
        timestamp: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function emitLoginFailure(tenantId, email, ip, reason) {
    await (0, publish_with_dsoc_1.publish)('dauth.login.failure', tenantId || platform_core_2.SYSTEM_TENANT, {
        email,
        ip,
        reason,
        timestamp: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function emitRegistration(tenantId, userId, email) {
    await (0, publish_with_dsoc_1.publish)('dauth.registration.completed', tenantId, {
        userId,
        email,
        timestamp: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
//# sourceMappingURL=auth-orchestrator.service.js.map