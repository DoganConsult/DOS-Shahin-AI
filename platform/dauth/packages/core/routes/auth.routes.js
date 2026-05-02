"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const http_3 = require("@dos/platform-core/http");
const session_middleware_1 = require("../middleware/session.middleware");
const auth_orchestrator_service_1 = require("../identity/auth-orchestrator.service");
const login_protection_service_1 = require("../identity/login-protection.service");
const token_service_1 = require("../identity/token.service");
const token_blacklist_service_1 = require("../session/token-blacklist.service");
const revocation_service_1 = require("../session/revocation.service");
const mfa_service_1 = require("../mfa/mfa.service");
const credential_recovery_service_1 = require("../identity/credential-recovery.service");
const decision_log_service_1 = require("../audit/decision-log.service");
const security_event_service_1 = require("../audit/security-event.service");
const access_snapshot_service_1 = require("../access/access-snapshot.service");
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const resilience_1 = require("@dos/platform-core/resilience");
const http_4 = require("@dos/platform-core/http");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
router.use((0, http_1.auditMiddleware)('auth'));
const loginBody = zod_1.z.object({
    email: zod_1.z.string().min(1).max(254),
    password: zod_1.z.string().min(1),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
const mfaVerifyBody = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(4).max(8),
    mfaType: zod_1.z.enum(['email', 'totp']).optional(),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
const changePasswordBody = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
const forgotPasswordBody = zod_1.z.object({
    email: zod_1.z.string().email().max(254),
});
const resetPasswordBody = zod_1.z.object({
    token: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
const _enableTotpBody = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
});
const verifyTotpSetupBody = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(6).max(6),
});
const mfaToggleBody = zod_1.z.object({
    mfaType: zod_1.z.enum(['email', 'totp']),
    enabled: zod_1.z.boolean(),
});
router.post('/login', (0, http_3.validate)({ body: loginBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const throttle = await (0, login_protection_service_1.checkLoginThrottle)(email);
    if (!throttle.allowed) {
        await (0, auth_orchestrator_service_1.emitLoginFailure)(null, email, ip, 'throttled');
        res.status(throttle.locked ? 423 : 429).json({
            error: throttle.locked ? 'Account temporarily locked due to repeated failures' : 'Too many login attempts',
            code: throttle.locked ? 'ACCOUNT_LOCKED' : 'RATE_LIMIT_EXCEEDED',
            retryAfterSeconds: throttle.retryAfterSeconds,
            requireCaptcha: throttle.requireCaptcha,
            remainingAttempts: throttle.remainingAttempts,
        });
        return;
    }
    const user = await (0, auth_orchestrator_service_1.authenticateCredentials)(email, password);
    if (!user) {
        await (0, login_protection_service_1.recordFailedLogin)(email, ip);
        await (0, auth_orchestrator_service_1.emitLoginFailure)(null, email, ip, 'invalid_credentials');
        res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
        return;
    }
    const statusBlock = (0, auth_orchestrator_service_1.checkAccountStatus)(user.status);
    if (statusBlock) {
        await (0, auth_orchestrator_service_1.emitLoginFailure)(user.tenant_id, email, ip, statusBlock);
        const statusCode = statusBlock === 'suspended' ? 403 : 401;
        res.status(statusCode).json({
            error: statusBlock === 'suspended' ? 'Account suspended. Contact your administrator.' : 'Account is inactive.',
            code: statusBlock === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_INACTIVE',
        });
        return;
    }
    if (user.must_change_password) {
        await (0, login_protection_service_1.clearLoginFailures)(email);
        res.json((0, auth_orchestrator_service_1.buildMustChangePasswordResponse)(user));
        return;
    }
    const mfaRecord = await (0, auth_orchestrator_service_1.checkMfaEnabled)(user.user_id);
    if (mfaRecord) {
        const { response, emailCode } = await (0, auth_orchestrator_service_1.handleMfaChallenge)(user, mfaRecord);
        if (emailCode) {
            observability_1.logger.info('[DAuth] MFA email code generated', { userId: user.user_id, mfaType: 'email' });
        }
        await (0, login_protection_service_1.clearLoginFailures)(email);
        res.json(response);
        return;
    }
    const allRoles = await (0, auth_orchestrator_service_1.resolveUserRoles)(user.user_id, user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    const tokens = await (0, auth_orchestrator_service_1.issueLoginTokens)(user, effectiveRole, rememberMe, ip, userAgent);
    const { orgName, tenantMemberships, enterpriseAuthz, sessionId } = await (0, auth_orchestrator_service_1.resolveLoginBootstrapData)(user.tenant_id, user.user_id, user.onboarding_complete);
    const loginResponse = (0, auth_orchestrator_service_1.buildLoginResponse)(user, tokens.accessToken, allRoles, effectiveRole, enterpriseAuthz, sessionId, orgName, tenantMemberships);
    (0, token_service_1.setRefreshTokenCookie)(res, tokens.refreshToken, rememberMe);
    await (0, auth_orchestrator_service_1.recordLoginTimestamp)(email);
    await (0, login_protection_service_1.recordSuccessfulLoginByEmail)(email, ip);
    await (0, login_protection_service_1.clearLoginFailures)(email);
    await (0, auth_orchestrator_service_1.emitLoginSuccess)(user.tenant_id, user.user_id, ip, false);
    await (0, decision_log_service_1.logAuthDecision)(user.tenant_id, {
        userId: user.user_id,
        permissionCode: 'identity.login',
        decision: 'allow',
        reason: 'Credentials verified',
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, http_4.setAuditData)(res, { action: 'login', entityType: 'session', entityId: user.user_id, afterState: { email: user.email, role: effectiveRole, mfa: false } });
    await (0, security_event_service_1.logSecurityEvent)(user.tenant_id, user.user_id, 'login_success', { ip, userAgent }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json(loginResponse);
}));
router.post('/mfa/verify', (0, http_3.validate)({ body: mfaVerifyBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { userId, code, mfaType, rememberMe } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const mfaStatus = await (0, mfa_service_1.getMfaStatus)(userId);
    if (!mfaStatus.enabled) {
        res.status(400).json({ error: 'MFA not enabled for this user', code: 'MFA_NOT_ENABLED' });
        return;
    }
    let verified = false;
    const effectiveMfaType = mfaType || mfaStatus.mfaType;
    if (effectiveMfaType === 'totp') {
        verified = await (0, mfa_service_1.verifyTotp)(userId, code);
    }
    else if (effectiveMfaType === 'email') {
        verified = await (0, mfa_service_1.verifyEmailChallenge)(userId, code);
    }
    if (!verified) {
        await (0, auth_orchestrator_service_1.emitLoginFailure)(null, userId, ip, 'mfa_invalid');
        res.status(401).json({ error: 'Invalid verification code', code: 'MFA_INVALID_CODE' });
        return;
    }
    const result = await (0, auth_orchestrator_service_1.completeMfaLogin)(userId, rememberMe, ip, userAgent);
    if (!result) {
        res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        return;
    }
    if (!result.tokens) {
        const statusBlock = (0, auth_orchestrator_service_1.checkAccountStatus)(result.user.status);
        res.status(403).json({
            error: statusBlock === 'suspended' ? 'Account suspended' : 'Account inactive',
            code: statusBlock === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_INACTIVE',
        });
        return;
    }
    const loginResponse = (0, auth_orchestrator_service_1.buildLoginResponse)(result.user, result.tokens.accessToken, result.allRoles, result.effectiveRole, result.enterpriseAuthz, result.sessionId, result.orgName, result.tenantMemberships);
    (0, token_service_1.setRefreshTokenCookie)(res, result.tokens.refreshToken, rememberMe);
    await (0, auth_orchestrator_service_1.recordLoginTimestamp)(result.user.email);
    await (0, auth_orchestrator_service_1.emitLoginSuccess)(result.user.tenant_id, result.user.user_id, ip, true);
    (0, http_4.setAuditData)(res, { action: 'mfa_verify', entityType: 'session', entityId: result.user.user_id, afterState: { mfa: true, role: result.effectiveRole } });
    await (0, security_event_service_1.logSecurityEvent)(result.user.tenant_id, result.user.user_id, 'login_success', { ip, userAgent, metadata: { mfa: true } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json(loginResponse);
}));
router.post('/refresh', (0, http_3.validate)({ body: auth_schemas_1.refreshBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const refreshToken = req.cookies?.dauth_rt || req.cookies?.refreshToken || req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
        res.status(401).json({ error: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
        return;
    }
    const payload = (0, token_service_1.verifyRefreshToken)(refreshToken);
    if (!payload) {
        (0, token_service_1.clearRefreshTokenCookie)(res);
        res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
        return;
    }
    const userResult = await (0, db_1.safeQuery)('SELECT user_id, email, tenant_id, role, name, status, onboarding_complete, is_super_admin FROM users WHERE user_id = $1', [payload.userId]);
    const user = userResult.rows[0];
    if (!user || user.status === 'suspended' || user.status === 'locked' || user.status === 'deactivated') {
        (0, token_service_1.clearRefreshTokenCookie)(res);
        res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
        return;
    }
    const allRoles = await (0, auth_orchestrator_service_1.resolveUserRoles)(user.user_id, user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    const newAccessToken = (0, token_service_1.generateAccessToken)({
        userId: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
        role: effectiveRole,
        role_code: effectiveRole,
        is_super_admin: user.is_super_admin === true,
    });
    const dec = (0, token_service_1.decodeTokenUnsafe)(newAccessToken);
    if (dec?.jti) {
        await (0, token_blacklist_service_1.registerActiveJtiForUser)(user.user_id, dec.jti, 3600).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    res.json({
        token: newAccessToken,
        userId: user.user_id,
        tenantId: user.tenant_id,
        role: effectiveRole,
        roles: allRoles,
    });
}));
router.post('/logout', session_middleware_1.optionalAuthenticate, (0, http_2.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const token = req.headers.authorization?.replace('Bearer ', '');
    const tenantId = req.user?.tenantId || req.tenantId;
    if (token) {
        const dec = (0, token_service_1.decodeTokenUnsafe)(token);
        if (dec?.jti) {
            await (0, token_blacklist_service_1.blacklistToken)(dec.jti, dec.exp ? dec.exp - Math.floor(Date.now() / 1000) : 3600).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
            if (userId)
                await (0, token_blacklist_service_1.removeActiveJtiForUser)(userId, dec.jti).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        }
    }
    if (userId) {
        await (0, revocation_service_1.revokeAllUserSessions)(userId, 'user_logout', userId).catch((0, resilience_1.catchHandler)(resilience_1.EC.DB_CLEANUP));
    }
    (0, token_service_1.clearRefreshTokenCookie)(res);
    if (userId && tenantId) {
        await (0, decision_log_service_1.logAuthDecision)(tenantId, {
            userId,
            permissionCode: 'identity.logout',
            decision: 'allow',
            reason: 'User logged out',
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        (0, http_4.setAuditData)(res, { action: 'logout', entityType: 'session', entityId: userId });
        await (0, security_event_service_1.logSecurityEvent)(tenantId, userId, 'logout', { ip: req.ip || '' }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    res.json({ success: true, message: 'Logged out successfully' });
}));
router.get('/userinfo', session_middleware_1.authenticate, (0, http_2.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    const userResult = await (0, db_1.safeQuery)(`SELECT user_id, email, name, role, status, tenant_id, onboarding_complete,
            member_onboarded, is_super_admin, avatar_url, locale, timezone,
            created_at, last_login_at
     FROM users WHERE user_id = $1`, [userId]);
    const user = userResult.rows[0];
    if (!user) {
        res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        return;
    }
    const allRoles = await (0, auth_orchestrator_service_1.resolveUserRoles)(userId, tenantId || user.tenant_id, user.role);
    const effectiveRole = allRoles[0] || user.role;
    let orgName = '';
    try {
        const tenantResult = await (0, db_1.safeQuery)('SELECT org_name FROM tenants WHERE tenant_id = $1', [user.tenant_id]);
        orgName = tenantResult.rows[0]?.org_name || '';
    }
    catch { /* non-blocking */ }
    let mfaEnabled = false;
    try {
        const mfa = await (0, mfa_service_1.getMfaStatus)(userId);
        mfaEnabled = mfa.enabled;
    }
    catch { /* non-blocking */ }
    res.json({
        userId: user.user_id,
        email: user.email,
        name: user.name || '',
        role: effectiveRole,
        roles: allRoles,
        tenantId: user.tenant_id,
        orgName,
        status: user.status,
        onboardingComplete: user.onboarding_complete ?? false,
        memberOnboarded: user.member_onboarded ?? false,
        isSuperAdmin: user.is_super_admin === true,
        avatarUrl: user.avatar_url || null,
        locale: user.locale || 'en',
        timezone: user.timezone || 'UTC',
        mfaEnabled,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
    });
}));
router.post('/change-password', session_middleware_1.authenticate, (0, http_3.validate)({ body: changePasswordBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    const { currentPassword, newPassword } = req.body;
    const result = await (0, auth_orchestrator_service_1.changePassword)(userId, tenantId, currentPassword, newPassword, 8, 12);
    if (!result.success) {
        const errResult = result;
        res.status(errResult.statusCode || 400).json({ error: errResult.error, code: errResult.error });
        return;
    }
    (0, http_4.setAuditData)(res, { action: 'change_password', entityType: 'credential', entityId: userId });
    await (0, security_event_service_1.logSecurityEvent)(tenantId, userId, 'password_changed', { ip: req.ip || '' }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json({ success: true, token: result.token, message: 'Password changed successfully' });
}));
router.post('/forgot-password', (0, http_3.validate)({ body: forgotPasswordBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    await (0, credential_recovery_service_1.requestPasswordReset)(email, req.tenantId || 'system').catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {
        operation: 'auth.requestPasswordReset',
        tenantId: req.tenantId || 'system',
    }));
    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
}));
router.post('/reset-password', (0, http_3.validate)({ body: resetPasswordBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { token, newPassword } = req.body;
    const valid = await (0, credential_recovery_service_1.validateResetToken)(token);
    if (!valid) {
        res.status(400).json({ error: 'Invalid or expired reset token', code: 'INVALID_RESET_TOKEN' });
        return;
    }
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(newPassword, 12);
    const success = await (0, credential_recovery_service_1.completePasswordReset)(token, hash);
    if (!success) {
        res.status(400).json({ error: 'Password reset failed', code: 'RESET_FAILED' });
        return;
    }
    (0, http_4.setAuditData)(res, { action: 'reset_password', entityType: 'credential' });
    res.json({ success: true, message: 'Password has been reset. Please log in with your new password.' });
}));
router.post('/verify-email', (0, http_3.validate)({ body: auth_schemas_1.verifyEmailBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const success = await (0, credential_recovery_service_1.verifyEmail)(token);
    if (!success) {
        res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
        return;
    }
    (0, http_4.setAuditData)(res, { action: 'verify_email', entityType: 'identity' });
    res.json({ success: true, message: 'Email verified successfully' });
}));
router.post('/resend-verification', (0, http_3.validate)({ body: forgotPasswordBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const userResult = await (0, db_1.safeQuery)('SELECT user_id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]).catch(() => ({ rows: [] }));
    const user = userResult.rows[0];
    if (user) {
        await (0, credential_recovery_service_1.requestEmailVerification)(user.user_id, email, user.tenant_id || 'system').catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {
            operation: 'auth.requestEmailVerification',
            tenantId: user.tenant_id || 'system',
            userId: user.user_id,
        }));
    }
    res.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
}));
router.get('/mfa/status', session_middleware_1.authenticate, (0, http_2.asyncHandler)(async (req, res) => {
    const status = await (0, mfa_service_1.getMfaStatus)(req.user.userId);
    res.json({ data: status });
}));
router.post('/mfa/enable', session_middleware_1.authenticate, (0, http_3.validate)({ body: mfaToggleBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { mfaType } = req.body;
    const userId = req.user.userId;
    if (mfaType === 'totp') {
        const tenantId = req.user.tenantId || req.tenantId || '';
        const result = await (0, mfa_service_1.enableTotp)(userId, tenantId);
        (0, http_4.setAuditData)(res, { action: 'mfa_enable_totp', entityType: 'mfa', entityId: userId });
        await (0, security_event_service_1.logSecurityEvent)(req.user.tenantId || req.tenantId || '', userId, 'mfa_enabled', { metadata: { mfaType: 'totp' } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        res.json({
            success: true,
            mfaType: 'totp',
            secret: result.secret,
            qrCode: result.qrCodeUrl,
            message: 'Scan the QR code with your authenticator app, then verify.',
        });
    }
    else {
        await (0, mfa_service_1.enableMfa)(userId, 'email');
        (0, http_4.setAuditData)(res, { action: 'mfa_enable_email', entityType: 'mfa', entityId: userId });
        await (0, security_event_service_1.logSecurityEvent)(req.user.tenantId || req.tenantId || '', userId, 'mfa_enabled', { metadata: { mfaType: 'email' } }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
        res.json({ success: true, mfaType: 'email', message: 'Email MFA enabled.' });
    }
}));
router.post('/mfa/verify-setup', session_middleware_1.authenticate, (0, http_3.validate)({ body: verifyTotpSetupBody }), (0, http_2.asyncHandler)(async (req, res) => {
    const { userId, code } = req.body;
    if (userId !== req.user.userId) {
        res.status(403).json({ error: 'Cannot verify MFA for another user', code: 'FORBIDDEN' });
        return;
    }
    const verified = await (0, mfa_service_1.verifyTotp)(userId, code);
    if (!verified) {
        res.status(400).json({ error: 'Invalid TOTP code', code: 'MFA_INVALID_CODE' });
        return;
    }
    res.json({ success: true, message: 'TOTP MFA verified and active.' });
}));
router.post('/mfa/disable', session_middleware_1.authenticate, (0, http_2.asyncHandler)(async (req, res) => {
    await (0, mfa_service_1.disableMfa)(req.user.userId);
    (0, http_4.setAuditData)(res, { action: 'mfa_disable', entityType: 'mfa', entityId: req.user.userId });
    await (0, security_event_service_1.logSecurityEvent)(req.user.tenantId || req.tenantId || '', req.user.userId, 'mfa_disabled').catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json({ success: true, message: 'MFA disabled.' });
}));
router.get('/me/access-snapshot', session_middleware_1.authenticate, (0, http_2.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
        return;
    }
    const snapshot = await access_snapshot_service_1.accessSnapshotService.getUserAuthzPayload(tenantId, userId);
    res.json({ data: snapshot });
}));
router.post('/revoke-all-sessions', session_middleware_1.authenticate, (0, http_2.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const _tenantId = req.user.tenantId || req.tenantId;
    await (0, token_blacklist_service_1.revokeAllUserTokens)(userId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, revocation_service_1.revokeAllUserSessions)(userId, 'user_revoke_all', userId).catch((0, resilience_1.catchHandler)(resilience_1.EC.DB_CLEANUP));
    (0, token_service_1.clearRefreshTokenCookie)(res);
    (0, http_4.setAuditData)(res, { action: 'revoke_all_sessions', entityType: 'session', entityId: userId });
    await (0, security_event_service_1.logSecurityEvent)(req.user.tenantId || req.tenantId || '', userId, 'sessions_revoked').catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    res.json({ success: true, message: 'All sessions revoked.' });
}));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map