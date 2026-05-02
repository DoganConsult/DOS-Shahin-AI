import { v4 as uuid } from 'uuid';
import { query, safeQuery } from '@dos/db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenExpirySeconds,
  decodeTokenUnsafe,
  type AuthPayload,
} from '../identity/token.service';
import { blacklistToken, isTokenBlacklisted, revokeAllUserTokens } from './token-blacklist.service';
import { logger } from '@dos/platform-core/observability';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const MAX_CONCURRENT_SESSIONS = 5;

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionCreateInput {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  rememberMe?: boolean;
  permissions?: string[];
  roles?: string[];
  language?: string;
  departmentId?: string;
  name?: string;
  meta?: SessionMeta;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function persistSession(params: {
  sessionId: string;
  userId: string;
  tenantId: string;
  jti: string;
  refreshJti?: string | null;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<void> {
  // Enforce concurrent session limit
  const countResult = await safeQuery(
    `SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND revoked_at IS NULL`,
    [params.userId],
  );
  const activeCount = parseInt((countResult.rows[0] as { count?: string })?.count ?? '0', 10);
  if (activeCount >= MAX_CONCURRENT_SESSIONS) {
    await safeQuery(
      `UPDATE sessions SET revoked_at = NOW() WHERE session_id = (
        SELECT session_id FROM sessions WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1
      )`,
      [params.userId],
    );
  }

  await safeQuery(
    `INSERT INTO sessions (session_id, user_id, tenant_id, jti, refresh_jti, ip_address, user_agent, created_at, last_active_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
     ON CONFLICT DO NOTHING`,
    [
      params.sessionId,
      params.userId,
      params.tenantId,
      params.jti,
      params.refreshJti ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      params.expiresAt,
    ],
  );
}

async function revokeSessionByRefreshJti(refreshJti: string): Promise<void> {
  await safeQuery(
    `UPDATE sessions SET revoked_at = NOW() WHERE refresh_jti = $1 AND revoked_at IS NULL`,
    [refreshJti],
  );
}

async function revokeSessionByJti(jti: string): Promise<void> {
  await safeQuery(
    `UPDATE sessions SET revoked_at = NOW() WHERE jti = $1 AND revoked_at IS NULL`,
    [jti],
  );
}

async function revokeAllSessionsByUser(userId: string): Promise<void> {
  await safeQuery(
    `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

export async function createSession(input: SessionCreateInput): Promise<SessionTokens> {
  const payload: AuthPayload = {
    userId: input.userId,
    email: input.email,
    tenantId: input.tenantId,
    role: input.role,
    permissions: input.permissions,
    roles: input.roles,
    language: input.language,
    departmentId: input.departmentId,
    name: input.name,
    jti: uuid(),
  };
  const rememberMe = input.rememberMe !== false;
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(input.userId, input.tenantId, rememberMe);
  const refreshDecoded = decodeTokenUnsafe(refreshToken) as { jti?: string; userId?: string; tenantId?: string } | null;
  const expiresSeconds = rememberMe ? 7 * 24 * 60 * 60 : 3600;
  
  await persistSession({
    sessionId: uuid(),
    userId: input.userId,
    tenantId: input.tenantId,
    jti: payload.jti!,
    refreshJti: refreshDecoded?.jti ?? null,
    ipAddress: input.meta?.ipAddress,
    userAgent: input.meta?.userAgent,
    expiresAt: new Date(Date.now() + expiresSeconds * 1000),
  }).catch(err => logger.error('[DAuth] session persist failed', { error: (err as Error).message }));
  
  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
  };
}

export async function refreshSession(
  refreshTokenValue: string,
): Promise<SessionTokens | null> {
  const decoded = verifyRefreshToken(refreshTokenValue) as { userId: string; tenantId: string; jti?: string; ip?: string } | null;
  if (!decoded) {
    logger.warn('[DAuth] Token refresh failed', { reason: 'invalid or expired refresh token' });
    return null;
  }

  if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
    logger.warn('[DAuth] Token refresh failed', { reason: 'refresh token blacklisted', userId: decoded.userId });
    return null;
  }

  const userResult = await query(
    `SELECT user_id, email, role, tenant_id, status FROM users WHERE user_id = $1 LIMIT 1`,
    [decoded.userId],
  );
  if (!userResult.rows.length) {
    logger.warn('[DAuth] Token refresh failed', { reason: 'user not found', userId: decoded.userId });
    return null;
  }
  
  const user = userResult.rows[0] as { user_id: string; email: string; tenant_id: string; role: string; status: string; is_super_admin?: boolean };
  if (user.status !== 'active') {
    logger.warn('[DAuth] Token refresh failed', { reason: `user status is ${user.status}`, userId: decoded.userId });
    return null;
  }

  if (decoded.jti) {
    await blacklistToken(decoded.jti, decoded.userId, 60).catch(catchHandler(EC.EVENT_BUS));
    void revokeSessionByRefreshJti(decoded.jti);
  }

  const tokens = await createSession({
    userId: user.user_id,
    email: user.email,
    tenantId: user.tenant_id,
    role: user.role,
  });

  logger.info('[DAuth] Token refreshed', { userId: decoded.userId, tenantId: decoded.tenantId, ip: decoded.ip });

  return tokens;
}

export async function destroySession(userId: string, jti?: string): Promise<void> {
  if (jti) {
    await blacklistToken(jti, userId).catch(catchHandler(EC.EVENT_BUS));
    void revokeSessionByJti(jti);
  }
  await revokeAllUserTokens(userId).catch(catchHandler(EC.EVENT_BUS));
  void revokeAllSessionsByUser(userId);
}

export async function isSessionValid(jti: string): Promise<boolean> {
  return !(await isTokenBlacklisted(jti));
}
