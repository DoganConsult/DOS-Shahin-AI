/**
 * Canonical JWT issuance for DOS platform services.
 *
 * Single source of truth for access + refresh token signing. Services that
 * need to mint tokens (auth-service login, onboarding-service register,
 * invitation accept, etc.) MUST import from here — no service-local JWT
 * signing is permitted.
 *
 * Secret resolution is delegated to @dos/platform-core's
 * `resolveJwtSigningSecret`, which enforces production-mode fail-closed
 * semantics and rejects weak dev sentinels.
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { resolveJwtSigningSecret } from '@dos/platform-core';

export interface AccessTokenClaims {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  role_code: string;
  is_super_admin: boolean;
  /** Optional — platform-wide role (e.g. 'platform_admin'). */
  platformRole?: string;
  /** Optional — onboarding session id to bind to this access token. */
  sessionId?: string;
  /** Optional — tenant schema name, useful for downstream `search_path` pinning. */
  schemaName?: string;
}

export interface IssueAccessTokenOptions {
  jti?: string;
  /** Override default expiry ("1h"). Seconds number OR zeit string. */
  expiresIn?: string | number;
  /** Context label surfaced in JWT-secret policy errors. */
  context?: string;
}

export interface IssueRefreshTokenOptions {
  jti?: string;
  familyId?: string;
  /** Override default expiry ("7d"). Seconds number OR zeit string. */
  expiresIn?: string | number;
  /** Context label surfaced in JWT-secret policy errors. */
  context?: string;
}

export interface RefreshTokenResult {
  token: string;
  jti: string;
  familyId: string;
  expiresAt: Date;
}

const DEFAULT_ACCESS_EXPIRES_IN = '1h';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
const DEFAULT_CONTEXT = '@dos/auth:jwt-issuer';

function resolveExpiresIn(raw: string | number | undefined, fallback: string): string | number {
  if (raw == null) {
    const envRaw = process.env.JWT_EXPIRES_IN;
    if (envRaw) return /^\d+$/.test(envRaw) ? Number(envRaw) : envRaw;
    return fallback;
  }
  if (typeof raw === 'number') return raw;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

function resolveRefreshExpiresIn(raw: string | number | undefined, fallback: string): string | number {
  if (raw == null) {
    const envRaw = process.env.JWT_REFRESH_EXPIRES_IN;
    if (envRaw) return /^\d+$/.test(envRaw) ? Number(envRaw) : envRaw;
    return fallback;
  }
  if (typeof raw === 'number') return raw;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

export function issueAccessToken(
  claims: AccessTokenClaims,
  options?: IssueAccessTokenOptions,
): string {
  const jti = options?.jti ?? uuid();
  const expiresIn = resolveExpiresIn(options?.expiresIn, DEFAULT_ACCESS_EXPIRES_IN);
  const secret = resolveJwtSigningSecret(options?.context || DEFAULT_CONTEXT);
  const payload = { ...claims, jti, principalType: 'human' as const };
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Mint a refresh token. The caller is responsible for persisting the
 * family row via `refresh_token_families` (see @dos/auth session
 * domain helpers) — this function only signs the JWT.
 */
export function issueRefreshToken(
  userId: string,
  tenantId: string,
  options?: IssueRefreshTokenOptions,
): RefreshTokenResult {
  const jti = options?.jti ?? uuid();
  const familyId = options?.familyId ?? uuid();
  const expiresIn = resolveRefreshExpiresIn(options?.expiresIn, DEFAULT_REFRESH_EXPIRES_IN);
  const secret = resolveJwtSigningSecret(options?.context || DEFAULT_CONTEXT);

  const token = jwt.sign(
    { userId, tenantId, jti, familyId, type: 'refresh' },
    secret,
    { expiresIn } as jwt.SignOptions,
  );

  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expSec = decoded?.exp;
  const expiresAt = expSec ? new Date(expSec * 1000) : new Date(Date.now() + 7 * 24 * 3600_000);

  return { token, jti, familyId, expiresAt };
}
