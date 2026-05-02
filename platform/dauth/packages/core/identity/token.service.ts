/**
 * DAuth TokenService — single canonical JWT token management.
 * Replaces deleted middleware/auth.ts token functions + config/jwt.ts.
 *
 * Law 1: One canonical service per concern.
 * Law 9: Organized by concern (dauth/), not implementation pattern.
 */
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import type { PrincipalType } from './identity.service';

// ── Types ──

export interface AuthPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  role_code?: string;
  is_super_admin?: boolean;
  permissions?: string[];
  jti?: string;
  language?: string;
  departmentId?: string;
  name?: string;
  role_profile?: string;
  roles?: string[];
  archetypes?: string[];
  orgUnitIds?: string[];
  mustChangePassword?: boolean;
  principalType?: PrincipalType;
  actorId?: string;
  scopes?: string[];
}

// PrincipalType is canonically defined in identity.service and re-exported here
// for consumers of the token.service surface.
export type { PrincipalType } from './identity.service';

export interface GenerateTokenOptions {
  expiresIn?: string;
}

const DEFAULT_TTL_HUMAN = '15m';
const DEFAULT_TTL_AGENT = '5m';
const DEFAULT_TTL_SERVICE_ACCOUNT = '60m';
const DEFAULT_TTL_EXTERNAL = '15m';

export function resolveAccessTokenTtl(principalType?: PrincipalType): string {
  switch (principalType) {
    case 'agent':
      return process.env.JWT_AGENT_EXPIRES_IN || DEFAULT_TTL_AGENT;
    case 'service_account':
      return process.env.JWT_SA_EXPIRES_IN || DEFAULT_TTL_SERVICE_ACCOUNT;
    case 'external':
      return process.env.JWT_EXTERNAL_EXPIRES_IN || DEFAULT_TTL_EXTERNAL;
    case 'human':
    default:
      return process.env.JWT_EXPIRES_IN || DEFAULT_TTL_HUMAN;
  }
}

// ── Secret ──

// Lazy-loaded secrets — resolved on first use, not at import time.
// This ensures dotenv.config() has already run before we read process.env.
let _jwtSecret: string | null = null;
let _jwtRefreshSecret: string | null = null;

export function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (secret) { _jwtSecret = secret; return secret; }
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    logger.warn('[DAuth] JWT_SECRET not set — using dev fallback. DO NOT deploy to production.');
    _jwtSecret = 'dev-secret';
    return _jwtSecret;
  }
  throw new Error('JWT_SECRET environment variable is required');
}

function getJwtRefreshSecret(): string {
  if (_jwtRefreshSecret) return _jwtRefreshSecret;
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret) { _jwtRefreshSecret = secret; return secret; }
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    logger.warn('[DAuth] JWT_REFRESH_SECRET not set — using dev fallback. DO NOT deploy to production.');
    _jwtRefreshSecret = getJwtSecret() + '_refresh';
    return _jwtRefreshSecret;
  }
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

// ── Access Tokens ──

export function generateAccessToken(
  payload: AuthPayload,
  opts: GenerateTokenOptions = {},
): string {
  const expiresIn = opts.expiresIn ?? resolveAccessTokenTtl(payload.principalType);
  const payloadWithJti: AuthPayload = { ...payload, jti: payload.jti || uuid() };
  return jwt.sign(payloadWithJti, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AuthPayload {
  // Synchronous path kept for back-compat with existing middleware and call
  // sites. Uses the native HS256 verifier directly.
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

/**
 * Async token verification that flows through the TokenVerifier port.
 * Enables Keycloak shadow/enforce mode without forcing every call site to
 * become async. Shadow mismatches are logged but do not affect the returned
 * payload — the decision ledger records divergences separately via the
 * decision-engine shadow-run path.
 *
 * New code should prefer this over `verifyAccessToken`.
 */
export async function verifyAccessTokenViaPort(token: string): Promise<AuthPayload> {
  const { getTokenVerifiers } = await import('../adapters/token-verifier.factory.js');
  const { primary, shadow } = getTokenVerifiers();

  const primaryResult = await primary.verify(token);

  if (shadow) {
    // Best-effort shadow — never throws into the main path.
    shadow
      .verify(token)
      .then((shadowResult) => {
        const delta = computePayloadDelta(primaryResult.payload, shadowResult.payload);
        if (delta.length > 0) {
          logger.warn('[DAuth:TokenVerifier] shadow mismatch', {
            primarySource: primaryResult.source,
            shadowSource: shadowResult.source,
            fields: delta,
          });
        }
      })
      .catch((err: unknown) => {
        logger.debug('[DAuth:TokenVerifier] shadow verify failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  return primaryResult.payload;
}

function computePayloadDelta(a: AuthPayload, b: AuthPayload): string[] {
  const fields = ['userId', 'email', 'tenantId', 'role'] as const;
  return fields.filter((f) => a[f] !== b[f]);
}

export function decodeTokenUnsafe(token: string): { jti?: string; exp?: number; iat?: number } | null {
  try {
    return jwt.decode(token) as { jti?: string; exp?: number; iat?: number } | null;
  } catch {
    return null;
  }
}

export function getAccessTokenExpirySeconds(principalType?: PrincipalType): number {
  const raw = resolveAccessTokenTtl(principalType).trim();
  const unitMatch = /^(\d+)\s*([smhd])$/i.exec(raw);
  if (unitMatch) {
    const n = parseInt(unitMatch[1], 10);
    const u = unitMatch[2].toLowerCase();
    const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
    return Math.max(1, n * mult);
  }
  if (/^\d+$/.test(raw)) return Math.max(1, parseInt(raw, 10));
  return 86400;
}

// ── Refresh Tokens ──

export function generateRefreshToken(userId: string, tenantId: string, rememberMe = true): string {
  const expiresIn = rememberMe ? '7d' : '1h';
  return jwt.sign({ userId, tenantId, type: 'refresh', jti: uuid() }, getJwtRefreshSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { userId: string; tenantId: string; jti?: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret()) as { type?: string; userId: string; tenantId: string; jti?: string };
    if (decoded.type !== 'refresh') return null;
    return { userId: decoded.userId, tenantId: decoded.tenantId, jti: decoded.jti };
  } catch {
    return null;
  }
}

// ── Cookies ──

import type { Response, NextFunction as _NextFunction, CookieOptions } from 'express';

import {  logger } from '@dos/platform-core/observability';

export function setRefreshTokenCookie(res: Response, refreshToken: string, rememberMe = true): void {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  };
  if (rememberMe) cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
  res.cookie('dauth_rt', refreshToken, cookieOptions);
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('dauth_rt', { path: '/api/auth' });
}
