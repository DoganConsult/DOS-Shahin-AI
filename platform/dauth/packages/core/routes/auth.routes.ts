import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { auditMiddleware } from '@dos/platform-core/http';
import { asyncHandler } from '@dos/platform-core/http';
import { validate } from '@dos/platform-core/http';
import { authenticate, optionalAuthenticate } from '../middleware/session.middleware';
import {
  authenticateCredentials,
  resolveUserRoles,
  issueLoginTokens,
  buildLoginResponse,
  handleMfaChallenge,
  completeMfaLogin,
  changePassword,
  checkMfaEnabled,
  checkAccountStatus,
  buildMustChangePasswordResponse,
  recordLoginTimestamp,
  resolveLoginBootstrapData,
  emitLoginSuccess,
  emitLoginFailure,
} from '../identity/auth-orchestrator.service';
import {
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginFailures,
  recordSuccessfulLoginByEmail,
} from '../identity/login-protection.service';
import {
  verifyRefreshToken,
  generateAccessToken,
  decodeTokenUnsafe,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../identity/token.service';
import {
  registerActiveJtiForUser,
  removeActiveJtiForUser,
  blacklistToken,
  revokeAllUserTokens,
} from '../session/token-blacklist.service';
import { revokeAllUserSessions } from '../session/revocation.service';
import {
  getMfaStatus,
  enableTotp,
  verifyTotp,
  verifyEmailChallenge,
  enableMfa,
  disableMfa,
} from '../mfa/mfa.service';
import {
  requestPasswordReset,
  validateResetToken,
  completePasswordReset,
  requestEmailVerification,
  verifyEmail,
} from '../identity/credential-recovery.service';
import { logAuthDecision } from '../audit/decision-log.service';
import { logSecurityEvent } from '../audit/security-event.service';
import { accessSnapshotService } from '../access/access-snapshot.service';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { setAuditData } from '@dos/platform-core/http';
import { refreshBody as refreshBodySchema, verifyEmailBody as verifyEmailBodySchema } from '../schemas/auth.schemas';

const router = Router();
router.use(auditMiddleware('auth'));

const loginBody = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const mfaVerifyBody = z.object({
  userId: z.string().uuid(),
  code: z.string().min(4).max(8),
  mfaType: z.enum(['email', 'totp']).optional(),
  rememberMe: z.boolean().optional().default(false),
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const forgotPasswordBody = z.object({
  email: z.string().email().max(254),
});

const resetPasswordBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const _enableTotpBody = z.object({
  userId: z.string().uuid(),
});

const verifyTotpSetupBody = z.object({
  userId: z.string().uuid(),
  code: z.string().min(6).max(6),
});

const mfaToggleBody = z.object({
  mfaType: z.enum(['email', 'totp']),
  enabled: z.boolean(),
});

router.post('/login', validate({ body: loginBody }), asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || '';

  const throttle = await checkLoginThrottle(email);
  if (!throttle.allowed) {
    await emitLoginFailure(null, email, ip, 'throttled');
    res.status(throttle.locked ? 423 : 429).json({
      error: throttle.locked ? 'Account temporarily locked due to repeated failures' : 'Too many login attempts',
      code: throttle.locked ? 'ACCOUNT_LOCKED' : 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: throttle.retryAfterSeconds,
      requireCaptcha: throttle.requireCaptcha,
      remainingAttempts: throttle.remainingAttempts,
    });
    return;
  }

  const user = await authenticateCredentials(email, password);
  if (!user) {
    await recordFailedLogin(email, ip);
    await emitLoginFailure(null, email, ip, 'invalid_credentials');
    res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const statusBlock = checkAccountStatus(user.status);
  if (statusBlock) {
    await emitLoginFailure(user.tenant_id, email, ip, statusBlock);
    const statusCode = statusBlock === 'suspended' ? 403 : 401;
    res.status(statusCode).json({
      error: statusBlock === 'suspended' ? 'Account suspended. Contact your administrator.' : 'Account is inactive.',
      code: statusBlock === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_INACTIVE',
    });
    return;
  }

  if (user.must_change_password) {
    await clearLoginFailures(email);
    res.json(buildMustChangePasswordResponse(user));
    return;
  }

  const mfaRecord = await checkMfaEnabled(user.user_id);
  if (mfaRecord) {
    const { response, emailCode } = await handleMfaChallenge(user, mfaRecord);
    if (emailCode) {
      logger.info('[DAuth] MFA email code generated', { userId: user.user_id, mfaType: 'email' });
    }
    await clearLoginFailures(email);
    res.json(response);
    return;
  }

  const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
  const effectiveRole = allRoles[0] || user.role;
  const tokens = await issueLoginTokens(user, effectiveRole, rememberMe, ip, userAgent);

  const { orgName, tenantMemberships, enterpriseAuthz, sessionId } =
    await resolveLoginBootstrapData(user.tenant_id, user.user_id, user.onboarding_complete);

  const loginResponse = buildLoginResponse(
    user, tokens.accessToken, allRoles, effectiveRole,
    enterpriseAuthz, sessionId, orgName, tenantMemberships,
  );

  setRefreshTokenCookie(res, tokens.refreshToken, rememberMe);
  await recordLoginTimestamp(email);
  await recordSuccessfulLoginByEmail(email, ip);
  await clearLoginFailures(email);
  await emitLoginSuccess(user.tenant_id, user.user_id, ip, false);

  await logAuthDecision(user.tenant_id, {
    userId: user.user_id,
    permissionCode: 'identity.login',
    decision: 'allow',
    reason: 'Credentials verified',
  }).catch(catchHandler(EC.EVENT_BUS));

  setAuditData(res, { action: 'login', entityType: 'session', entityId: user.user_id, afterState: { email: user.email, role: effectiveRole, mfa: false } });
  await logSecurityEvent(user.tenant_id, user.user_id, 'login_success', { ip, userAgent }).catch(catchHandler(EC.EVENT_BUS));

  res.json(loginResponse);
}));

router.post('/mfa/verify', validate({ body: mfaVerifyBody }), asyncHandler(async (req: Request, res: Response) => {
  const { userId, code, mfaType, rememberMe } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || '';

  const mfaStatus = await getMfaStatus(userId);
  if (!mfaStatus.enabled) {
    res.status(400).json({ error: 'MFA not enabled for this user', code: 'MFA_NOT_ENABLED' });
    return;
  }

  let verified = false;
  const effectiveMfaType = mfaType || mfaStatus.mfaType;
  if (effectiveMfaType === 'totp') {
    verified = await verifyTotp(userId, code);
  } else if (effectiveMfaType === 'email') {
    verified = await verifyEmailChallenge(userId, code);
  }

  if (!verified) {
    await emitLoginFailure(null, userId, ip, 'mfa_invalid');
    res.status(401).json({ error: 'Invalid verification code', code: 'MFA_INVALID_CODE' });
    return;
  }

  const result = await completeMfaLogin(userId, rememberMe, ip, userAgent);
  if (!result) {
    res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    return;
  }

  if (!result.tokens) {
    const statusBlock = checkAccountStatus(result.user.status);
    res.status(403).json({
      error: statusBlock === 'suspended' ? 'Account suspended' : 'Account inactive',
      code: statusBlock === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_INACTIVE',
    });
    return;
  }

  const loginResponse = buildLoginResponse(
    result.user, result.tokens.accessToken, result.allRoles, result.effectiveRole,
    result.enterpriseAuthz, result.sessionId, result.orgName, result.tenantMemberships,
  );

  setRefreshTokenCookie(res, result.tokens.refreshToken, rememberMe);
  await recordLoginTimestamp(result.user.email);
  await emitLoginSuccess(result.user.tenant_id, result.user.user_id, ip, true);

  setAuditData(res, { action: 'mfa_verify', entityType: 'session', entityId: result.user.user_id, afterState: { mfa: true, role: result.effectiveRole } });
  await logSecurityEvent(result.user.tenant_id, result.user.user_id, 'login_success', { ip, userAgent, metadata: { mfa: true } }).catch(catchHandler(EC.EVENT_BUS));

  res.json(loginResponse);
}));

router.post('/refresh', validate({ body: refreshBodySchema }), asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.dauth_rt || req.cookies?.refreshToken || req.cookies?.refresh_token || req.body?.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    clearRefreshTokenCookie(res);
    res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
    return;
  }

  const userResult = await safeQuery(
    'SELECT user_id, email, tenant_id, role, name, status, onboarding_complete, is_super_admin FROM users WHERE user_id = $1',
    [payload.userId],
  );
  const user = userResult.rows[0] as {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
    name?: string;
    status?: string;
    onboarding_complete?: boolean;
    is_super_admin?: boolean;
    member_onboarded?: boolean;
    avatar_url?: string | null;
    locale?: string | null;
    timezone?: string | null;
    created_at?: string;
    last_login_at?: string | null;
  } | undefined;
  if (!user || user.status === 'suspended' || user.status === 'locked' || user.status === 'deactivated') {
    clearRefreshTokenCookie(res);
    res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    return;
  }

  const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
  const effectiveRole = allRoles[0] || user.role;

  const newAccessToken = generateAccessToken({
    userId: user.user_id,
    email: user.email,
    tenantId: user.tenant_id,
    role: effectiveRole,
    role_code: effectiveRole,
    is_super_admin: user.is_super_admin === true,
  });

  const dec = decodeTokenUnsafe(newAccessToken);
  if (dec?.jti) {
    await registerActiveJtiForUser(user.user_id, dec.jti, 3600).catch(catchHandler(EC.EVENT_BUS));
  }

  res.json({
    token: newAccessToken,
    userId: user.user_id,
    tenantId: user.tenant_id,
    role: effectiveRole,
    roles: allRoles,
  });
}));

router.post('/logout', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const tenantId = req.user?.tenantId || req.tenantId;

  if (token) {
    const dec = decodeTokenUnsafe(token);
    if (dec?.jti) {
      await blacklistToken(dec.jti, dec.exp ? dec.exp - Math.floor(Date.now() / 1000) : 3600).catch(catchHandler(EC.EVENT_BUS));
      if (userId) await removeActiveJtiForUser(userId, dec.jti).catch(catchHandler(EC.EVENT_BUS));
    }
  }

  if (userId) {
    await revokeAllUserSessions(userId, 'user_logout', userId).catch(catchHandler(EC.DB_CLEANUP));
  }

  clearRefreshTokenCookie(res);

  if (userId && tenantId) {
    await logAuthDecision(tenantId, {
      userId,
      permissionCode: 'identity.logout',
      decision: 'allow',
      reason: 'User logged out',
    }).catch(catchHandler(EC.EVENT_BUS));
    setAuditData(res, { action: 'logout', entityType: 'session', entityId: userId });
    await logSecurityEvent(tenantId, userId, 'logout', { ip: req.ip || '' }).catch(catchHandler(EC.EVENT_BUS));
  }

  res.json({ success: true, message: 'Logged out successfully' });
}));

router.get('/userinfo', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;

  const userResult = await safeQuery(
    `SELECT user_id, email, name, role, status, tenant_id, onboarding_complete,
            member_onboarded, is_super_admin, avatar_url, locale, timezone,
            created_at, last_login_at
     FROM users WHERE user_id = $1`,
    [userId],
  );
  const user = userResult.rows[0] as {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
    name?: string;
    status?: string;
    onboarding_complete?: boolean;
    is_super_admin?: boolean;
    member_onboarded?: boolean;
    avatar_url?: string | null;
    locale?: string | null;
    timezone?: string | null;
    created_at?: string;
    last_login_at?: string | null;
  } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    return;
  }

  const allRoles = await resolveUserRoles(userId, tenantId || user.tenant_id, user.role);
  const effectiveRole = allRoles[0] || user.role;

  let orgName = '';
  try {
    const tenantResult = await safeQuery('SELECT org_name FROM tenants WHERE tenant_id = $1', [user.tenant_id]);
    orgName = tenantResult.rows[0]?.org_name || '';
  } catch { /* non-blocking */ }

  let mfaEnabled = false;
  try {
    const mfa = await getMfaStatus(userId);
    mfaEnabled = mfa.enabled;
  } catch { /* non-blocking */ }

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

router.post('/change-password', authenticate, validate({ body: changePasswordBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId!;
  const { currentPassword, newPassword } = req.body;

  const result = await changePassword(userId, tenantId, currentPassword, newPassword, 8, 12);
  if (!result.success) {
    const errResult = result as { statusCode?: number; error?: string };
    res.status(errResult.statusCode || 400).json({ error: errResult.error, code: errResult.error });
    return;
  }

  setAuditData(res, { action: 'change_password', entityType: 'credential', entityId: userId });
  await logSecurityEvent(tenantId, userId, 'password_changed', { ip: req.ip || '' }).catch(catchHandler(EC.EVENT_BUS));
  res.json({ success: true, token: result.token, message: 'Password changed successfully' });
}));

router.post('/forgot-password', validate({ body: forgotPasswordBody }), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await requestPasswordReset(email, req.tenantId || 'system').catch(catchHandler(EC.EVENT_BUS, {
    operation: 'auth.requestPasswordReset',
    tenantId: req.tenantId || 'system',
  }));
  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
}));

router.post('/reset-password', validate({ body: resetPasswordBody }), asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const valid = await validateResetToken(token);
  if (!valid) {
    res.status(400).json({ error: 'Invalid or expired reset token', code: 'INVALID_RESET_TOKEN' });
    return;
  }

  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(newPassword, 12);
  const success = await completePasswordReset(token, hash);
  if (!success) {
    res.status(400).json({ error: 'Password reset failed', code: 'RESET_FAILED' });
    return;
  }

  setAuditData(res, { action: 'reset_password', entityType: 'credential' });
  res.json({ success: true, message: 'Password has been reset. Please log in with your new password.' });
}));

router.post('/verify-email', validate({ body: verifyEmailBodySchema }), asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const success = await verifyEmail(token);
  if (!success) {
    res.status(400).json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' });
    return;
  }
  setAuditData(res, { action: 'verify_email', entityType: 'identity' });
  res.json({ success: true, message: 'Email verified successfully' });
}));

router.post('/resend-verification', validate({ body: forgotPasswordBody }), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const userResult = await safeQuery(
    'SELECT user_id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
  const user = userResult.rows[0] as {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
    name?: string;
    status?: string;
    onboarding_complete?: boolean;
    is_super_admin?: boolean;
    member_onboarded?: boolean;
    avatar_url?: string | null;
    locale?: string | null;
    timezone?: string | null;
    created_at?: string;
    last_login_at?: string | null;
  } | undefined;
  if (user) {
    await requestEmailVerification(user.user_id, email, user.tenant_id || 'system').catch(catchHandler(EC.EVENT_BUS, {
      operation: 'auth.requestEmailVerification',
      tenantId: user.tenant_id || 'system',
      userId: user.user_id,
    }));
  }
  res.json({ success: true, message: 'If the email exists, a verification link has been sent.' });
}));

router.get('/mfa/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const status = await getMfaStatus(req.user!.userId);
  res.json({ data: status });
}));

router.post('/mfa/enable', authenticate, validate({ body: mfaToggleBody }), asyncHandler(async (req: Request, res: Response) => {
  const { mfaType } = req.body;
  const userId = req.user!.userId;

  if (mfaType === 'totp') {
    const tenantId = req.user!.tenantId || req.tenantId || '';
    const result = await enableTotp(userId, tenantId);
    setAuditData(res, { action: 'mfa_enable_totp', entityType: 'mfa', entityId: userId });
    await logSecurityEvent(req.user!.tenantId || req.tenantId || '', userId, 'mfa_enabled', { metadata: { mfaType: 'totp' } }).catch(catchHandler(EC.EVENT_BUS));
    res.json({
      success: true,
      mfaType: 'totp',
      secret: result.secret,
      qrCode: result.qrCodeUrl,
      message: 'Scan the QR code with your authenticator app, then verify.',
    });
  } else {
    await enableMfa(userId, 'email');
    setAuditData(res, { action: 'mfa_enable_email', entityType: 'mfa', entityId: userId });
    await logSecurityEvent(req.user!.tenantId || req.tenantId || '', userId, 'mfa_enabled', { metadata: { mfaType: 'email' } }).catch(catchHandler(EC.EVENT_BUS));
    res.json({ success: true, mfaType: 'email', message: 'Email MFA enabled.' });
  }
}));

router.post('/mfa/verify-setup', authenticate, validate({ body: verifyTotpSetupBody }), asyncHandler(async (req: Request, res: Response) => {
  const { userId, code } = req.body;
  if (userId !== req.user!.userId) {
    res.status(403).json({ error: 'Cannot verify MFA for another user', code: 'FORBIDDEN' });
    return;
  }
  const verified = await verifyTotp(userId, code);
  if (!verified) {
    res.status(400).json({ error: 'Invalid TOTP code', code: 'MFA_INVALID_CODE' });
    return;
  }
  res.json({ success: true, message: 'TOTP MFA verified and active.' });
}));

router.post('/mfa/disable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  await disableMfa(req.user!.userId);
  setAuditData(res, { action: 'mfa_disable', entityType: 'mfa', entityId: req.user!.userId });
  await logSecurityEvent(req.user!.tenantId || req.tenantId || '', req.user!.userId, 'mfa_disabled').catch(catchHandler(EC.EVENT_BUS));
  res.json({ success: true, message: 'MFA disabled.' });
}));

router.get('/me/access-snapshot', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tenantId = req.user!.tenantId || req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  const snapshot = await accessSnapshotService.getUserAuthzPayload(tenantId, userId);
  res.json({ data: snapshot });
}));

router.post('/revoke-all-sessions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const _tenantId = req.user!.tenantId || req.tenantId!;
  await revokeAllUserTokens(userId).catch(catchHandler(EC.EVENT_BUS));
  await revokeAllUserSessions(userId, 'user_revoke_all', userId).catch(catchHandler(EC.DB_CLEANUP));
  clearRefreshTokenCookie(res);
  setAuditData(res, { action: 'revoke_all_sessions', entityType: 'session', entityId: userId });
  await logSecurityEvent(req.user!.tenantId || req.tenantId || '', userId, 'sessions_revoked').catch(catchHandler(EC.EVENT_BUS));
  res.json({ success: true, message: 'All sessions revoked.' });
}));

export default router;
