/**
 * DAuth Auth Orchestrator — canonical auth flow coordination.
 *
 * Extracts DAuth-owned authentication orchestration from route handlers
 * into reusable service functions that delegate to existing DAuth services.
 *
 * Law 2: One canonical owner per concern — auth orchestration belongs to DAuth.
 * Law 9: Organized by concern (dauth/identity/), not implementation pattern.
 */
import bcrypt from 'bcryptjs';
import { logger } from '@dos/platform-core/observability';
import { v4 as uuid } from 'uuid';
import {  safeQuery } from '@dos/db';
import {
  generateAccessToken,
  generateRefreshToken,
  decodeTokenUnsafe,
  getAccessTokenExpirySeconds,
} from './token.service';
import { registerActiveJtiForUser } from '../session/token-blacklist.service';
import { logAuthDecision } from '../audit/decision-log.service';
import { publish } from '../events/publish-with-dsoc';
import { withTimeout } from '@dos/platform-core';
import {
  createEmailChallenge,
} from '../mfa/mfa.service';
import { SYSTEM_TENANT } from '@dos/platform-core';
import type { AccessSnapshot } from '../contracts/access-snapshot.types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──

export interface AuthenticatedUser {
  user_id: string;
  email: string;
  tenant_id: string;
  role: string;
  name: string;
  status: string;
  onboarding_complete: boolean;
  member_onboarded: boolean;
  is_super_admin: boolean;
  must_change_password: boolean;
}

interface _AuthenticatedUserInternal extends AuthenticatedUser {
  password_hash: string;
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  accessJti: string | undefined;
}

export interface LoginResponsePayload {
  token: string;
  userId: string;
  tenantId: string;
  role: string;
  roles: string[];
  onboardingComplete: boolean;
  memberOnboarded: boolean;
  orgName: string;
  userName: string;
  isSuperAdmin: boolean;
  // Landing route owned by dos.tenant_landing_config (UI-OS resolver).
  // Bootstrap response no longer fabricates a default — null forces
  // SPA empty/no-op state.
  tenantLandingRoute: string | null;
  roleModules: string[];
  dashboardWidgets: string[];
  _moduleAuthority: string;
  enterpriseAuthz: AccessSnapshot | null;
  sessionId: string | null;
  sessionIdleTimeoutMinutes?: number;
  tenantMemberships?: Array<{ tenantId: string; role: string; isPrimary: boolean; orgName: string }>;
}

import { DAUTH_CONFIG } from '../dauth.config';

const LOGIN_CONTEXT_TIMEOUT_MS = DAUTH_CONFIG.loginContextTimeoutMs;
const OPTIONAL_AUTHZ_TIMEOUT_MS = DAUTH_CONFIG.optionalAuthzTimeoutMs;

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaType: string;
  userId: string;
  message: string;
}

// ── 1. authenticateCredentials ──

/**
 * Look up user by email, verify password with bcrypt.
 * Returns user row or null if credentials are invalid.
 * Does NOT record login attempts — caller handles that based on result.
 */
export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const result = await safeQuery(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1)
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) {
    logger.info('[AuthOrchestrator] authenticateCredentials: no user found', { email: email.substring(0, 3) + '***' });
    return null;
  }
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    logger.info('[AuthOrchestrator] authenticateCredentials: invalid password', { userId: user.user_id });
    return null;
  }

  logger.info('[AuthOrchestrator] authenticateCredentials: success', { userId: user.user_id, tenantId: user.tenant_id });
  return buildUserFromRow(user);
}

/**
 * Look up a user by email without verifying password.
 * Used for anti-enumeration: we need to know if user exists to record failed attempts.
 */
export async function lookupUserByEmail(
  email: string,
): Promise<AuthenticatedUser | null> {
  const result = await safeQuery(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1)
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) return null;
  return buildUserFromRow(user);
}

function buildUserFromRow(row: any): AuthenticatedUser {
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
export async function resolveUserRoles(
  userId: string,
  tenantId: string,
  fallbackRole: string,
): Promise<string[]> {
  try {
    const schema = `tenant_${tenantId}`;
    const result = await safeQuery(
      `SELECT DISTINCT r.role_code FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".roles r ON r.role_id = ura.role_id
       WHERE ura.user_id = $1 AND COALESCE(ura.is_active, ura.active) = TRUE AND r.active = TRUE
       ORDER BY r.role_code`,
      [userId],
    );
    if (result.rows.length > 0) {
      return result.rows.map((r: any) => r.role_code);
    }
    return [fallbackRole];
  } catch {
    return [fallbackRole];
  }
}

/**
 * Resolve a single effective role (first from roles list).
 */
export async function resolveUserRole(
  userId: string,
  tenantId: string,
  fallbackRole: string,
): Promise<string> {
  const roles = await resolveUserRoles(userId, tenantId, fallbackRole);
  return roles[0] || fallbackRole;
}

// ── 3. issueLoginTokens ──

/**
 * Generate access + refresh tokens, persist session, register JTI.
 * Returns the token pair and the access JTI.
 */
export async function issueLoginTokens(
  user: { user_id: string; email: string; tenant_id: string; is_super_admin: boolean },
  effectiveRole: string,
  rememberMe: boolean,
  ip: string,
  userAgent: string,
): Promise<LoginTokens> {
  const accessToken = generateAccessToken({
    userId: user.user_id,
    email: user.email,
    tenantId: user.tenant_id,
    role: effectiveRole,
    role_code: effectiveRole,
    is_super_admin: user.is_super_admin === true,
  });
  const refreshToken = generateRefreshToken(user.user_id, user.tenant_id, rememberMe);

  const dec = decodeTokenUnsafe(accessToken);
  const refreshDec = decodeTokenUnsafe(refreshToken);

  // Register JTI for active session tracking
  if (dec?.jti) {
    await registerActiveJtiForUser(user.user_id, dec.jti, getAccessTokenExpirySeconds()).catch(catchHandler(EC.EVENT_BUS));
  }

  // Persist session to DB for revocation tracking (DAuth canonical session)
  try {
    await safeQuery(
      `INSERT INTO sessions (session_id, user_id, tenant_id, jti, refresh_jti, ip_address, user_agent, created_at, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
       ON CONFLICT DO NOTHING`,
      [
        uuid(),
        user.user_id,
        user.tenant_id,
        dec?.jti ?? null,
        refreshDec?.jti ?? null,
        ip,
        userAgent,
        new Date(Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 3600 * 1000)),
      ],
    );
  } catch {
    // Non-blocking — session persistence failure should not prevent login
  }

  logger.info('[AuthOrchestrator] issueLoginTokens: tokens issued', { userId: user.user_id, tenantId: user.tenant_id, role: effectiveRole, jti: dec?.jti });
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
export function buildLoginResponse(
  user: { user_id: string; tenant_id: string; name: string; onboarding_complete: boolean; member_onboarded: boolean; is_super_admin: boolean },
  token: string,
  allRoles: string[],
  effectiveRole: string,
  enterpriseAuthz: AccessSnapshot | null,
  sessionId: string | null,
  orgName: string,
  tenantMemberships: Array<{ tenantId: string; role: string; isPrimary: boolean; orgName: string }>,
  sessionIdleTimeoutMinutes?: number,
): LoginResponsePayload {
  const response: LoginResponsePayload = {
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
    tenantLandingRoute: null as string | null,
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
export async function handleMfaChallenge(
  user: { user_id: string; email: string; tenant_id: string; name: string },
  mfaRecord: { mfa_type: string; enabled: boolean },
): Promise<{ response: MfaChallengeResponse; emailCode?: string }> {
  let emailCode: string | undefined;

  if (mfaRecord.mfa_type === 'email') {
    const { code } = await createEmailChallenge(user.user_id, user.tenant_id);
    emailCode = code;
  }

  const response: MfaChallengeResponse = {
    mfaRequired: true,
    mfaType: mfaRecord.mfa_type,
    userId: user.user_id,
    message: mfaRecord.mfa_type === 'email'
      ? 'A verification code has been sent to your email.'
      : 'Enter the code from your authenticator app.',
  };

  logger.info('[AuthOrchestrator] handleMfaChallenge: challenge created', { userId: user.user_id, mfaType: mfaRecord.mfa_type });
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
export async function completeMfaLogin(
  userId: string,
  rememberMe: boolean,
  ip: string,
  userAgent: string,
): Promise<{
  user: AuthenticatedUser;
  tokens: LoginTokens;
  allRoles: string[];
  effectiveRole: string;
  orgName: string;
  tenantMemberships: Array<{ tenantId: string; role: string; isPrimary: boolean; orgName: string }>;
  enterpriseAuthz: AccessSnapshot | null;
  sessionId: string | null;
} | null> {
  const userResult = await safeQuery(
    'SELECT user_id, email, tenant_id, role, name, status, onboarding_complete, is_super_admin, member_onboarded, must_change_password FROM users WHERE user_id = $1',
    [userId],
  );
  if (!userResult.rows.length) return null;
  const row: any = userResult.rows[0];

  const user: AuthenticatedUser = buildUserFromRow(row);

  // Status checks — caller should interpret and return appropriate HTTP response
  if (user.status === 'suspended' || user.status === 'inactive' || user.status === 'deactivated') {
    return { user, tokens: null as unknown as LoginTokens, allRoles: [], effectiveRole: '', orgName: '', tenantMemberships: [], enterpriseAuthz: null, sessionId: null };
  }

  const allRoles = await resolveUserRoles(user.user_id, user.tenant_id, user.role);
  const effectiveRole = allRoles[0] || user.role;

  const { orgName, tenantMemberships, enterpriseAuthz, sessionId } =
    await resolveLoginBootstrapData(user.tenant_id, user.user_id, user.onboarding_complete);

  const tokens = await issueLoginTokens(user, effectiveRole, rememberMe, ip, userAgent);

  logger.info('[AuthOrchestrator] completeMfaLogin: MFA login completed', { userId, tenantId: user.tenant_id, role: effectiveRole });
  return { user, tokens, allRoles, effectiveRole, orgName, tenantMemberships, enterpriseAuthz, sessionId };
}

// ── 7. changePassword ──

/**
 * Validate current password, enforce password policy, hash new password, update DB, issue new tokens.
 */
export async function changePassword(
  userId: string,
  tenantId: string,
  currentPassword: string,
  newPassword: string,
  minLength: number,
  bcryptRounds: number,
): Promise<{ success: true; token: string } | { success: false; error: string; statusCode: number }> {
  // Validate password policy
  if (newPassword.length < minLength) {
    return { success: false, error: 'WEAK_PASSWORD', statusCode: 400 };
  }
  if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
    return { success: false, error: 'WEAK_PASSWORD', statusCode: 400 };
  }

  // Fetch user and verify current password
  const userRes = await safeQuery(`SELECT password_hash, email, role FROM users WHERE user_id = $1`, [userId]);
  if (!userRes.rows.length) {
    return { success: false, error: 'NOT_FOUND', statusCode: 404 };
  }
  const user: any = userRes.rows[0];

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { success: false, error: 'INVALID_CREDENTIALS', statusCode: 401 };
  }

  // Hash and update
  const hash = await bcrypt.hash(newPassword, bcryptRounds);
  await safeQuery(`UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE user_id = $2`, [hash, userId]);
  logger.info('[AuthOrchestrator] changePassword: password updated', { userId, tenantId });

  // Issue new token
  const newToken = generateAccessToken({
    userId,
    email: user.email || '',
    tenantId,
    role: user.role || 'user',
    role_code: user.role || 'user',
  });

  await logAuthDecision(tenantId, {
    userId,
    permissionCode: 'identity.change_password',
    decision: 'allow',
    reason: 'Password changed successfully',
  }).catch(catchHandler(EC.EVENT_BUS));

  return { success: true, token: newToken };
}

// ── Shared helpers (used by login, MFA login, refresh flows) ──

/**
 * Resolve organization name from tenant ID.
 */
export async function resolveOrgName(tenantId: string): Promise<string> {
  try {
    const tenantResult = await safeQuery('SELECT org_name FROM tenants WHERE tenant_id = $1', [tenantId]);
    const row: any = tenantResult.rows[0];
    return row?.org_name || '';
  } catch {
    return '';
  }
}

export async function resolveLoginBootstrapData(
  tenantId: string,
  userId: string,
  onboardingComplete: boolean,
): Promise<{
  orgName: string;
  tenantMemberships: Array<{ tenantId: string; role: string; isPrimary: boolean; orgName: string }>;
  enterpriseAuthz: AccessSnapshot | null;
  sessionId: string | null;
}> {
  const [orgName, tenantMemberships, sessionId, enterpriseAuthz] = await Promise.all([
    withTimeout(() => resolveOrgName(tenantId), LOGIN_CONTEXT_TIMEOUT_MS).catch(() => ''),
    withTimeout(() => resolveTenantMemberships(userId), LOGIN_CONTEXT_TIMEOUT_MS).catch(() => []),
    withTimeout(() => resolveOnboardingSessionId(userId, onboardingComplete), LOGIN_CONTEXT_TIMEOUT_MS).catch((_err: unknown) => null),
    withTimeout(() => resolveEnterpriseAuthz(tenantId, userId), OPTIONAL_AUTHZ_TIMEOUT_MS).catch((_err: unknown) => null),
  ]);

  return { orgName, tenantMemberships, enterpriseAuthz, sessionId };
}

/**
 * Resolve tenant memberships for multi-tenant users.
 */
export async function resolveTenantMemberships(
  userId: string,
): Promise<Array<{ tenantId: string; role: string; isPrimary: boolean; orgName: string }>> {
  try {
    const result = await safeQuery(
      `SELECT tum.tenant_id, tum.role, tum.is_primary, t.org_name
       FROM tenant_user_memberships tum
       JOIN tenants t ON t.tenant_id = tum.tenant_id
       WHERE tum.user_id = $1 AND COALESCE(tum.status, 'active') = 'active'
       ORDER BY tum.is_primary DESC, tum.joined_at ASC`,
      [userId],
    );
    return result.rows.map((r: any) => ({
      tenantId: r.tenant_id,
      role: r.role,
      isPrimary: r.is_primary,
      orgName: r.org_name || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Resolve enterprise authorization snapshot for a user.
 */
export async function resolveEnterpriseAuthz(tenantId: string, userId: string): Promise<AccessSnapshot | null> {
  try {
    // Lazy import to avoid circular dependency
    const { accessSnapshotService } = await import('../access/access-snapshot.service.js');
    return (await accessSnapshotService.getUserAuthzPayload(tenantId, userId)) as AccessSnapshot;
  } catch {
    return null;
  }
}

/**
 * Resolve an active onboarding session ID for incomplete onboarding.
 */
export async function resolveOnboardingSessionId(
  userId: string,
  onboardingComplete: boolean,
): Promise<string | null> {
  if (onboardingComplete) return null;
  try {
    const result = await safeQuery(
      `SELECT id FROM public.onboarding_sessions
       WHERE started_by_user_id = $1 AND status NOT IN ('completed','cancelled')
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const row: any = result.rows[0];
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if MFA is enabled for a user. Returns the MFA record or null.
 */
export async function checkMfaEnabled(
  userId: string,
): Promise<{ mfa_type: string; enabled: boolean } | null> {
  try {
    const result = await safeQuery(
      `SELECT mfa_type, enabled FROM user_mfa WHERE user_id = $1 AND enabled = TRUE`,
      [userId],
    );
    return (result.rows[0] as { mfa_type: string; enabled: boolean } | undefined) || null;
  } catch {
    return null;
  }
}

/**
 * Update last login timestamp and increment login count.
 */
export async function recordLoginTimestamp(email: string): Promise<void> {
  await safeQuery(
    'UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE LOWER(email) = LOWER($1)',
    [email],
  ).catch(catchHandler(EC.EVENT_BUS));
}

/**
 * Check user account status. Returns null if OK, or the status string if blocked.
 */
export function checkAccountStatus(status: string): 'suspended' | 'inactive' | null {
  const s = status.toLowerCase();
  if (s === 'suspended') return 'suspended';
  if (s === 'inactive' || s === 'deactivated') return 'inactive';
  return null;
}

/**
 * Build must-change-password response (temporary token, no full login).
 */
export function buildMustChangePasswordResponse(
  user: { user_id: string; email: string; tenant_id: string; role: string },
): { mustChangePassword: true; token: string; userId: string; tenantId: string; role: string; message: string } {
  const tempToken = generateAccessToken({
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

export async function emitLoginSuccess(
  tenantId: string,
  userId: string,
  ip: string,
  mfa: boolean,
): Promise<void> {
  await publish('dauth.login.success', tenantId, {
    userId,
    ip,
    mfa,
    timestamp: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function emitLoginFailure(
  tenantId: string | null,
  email: string,
  ip: string,
  reason: string,
): Promise<void> {
  await publish('dauth.login.failure', tenantId || SYSTEM_TENANT, {
    email,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function emitRegistration(
  tenantId: string,
  userId: string,
  email: string,
): Promise<void> {
  await publish('dauth.registration.completed', tenantId, {
    userId,
    email,
    timestamp: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));
}
