/**
 * Gateway-origin verifier (Wave 1) — tenant-service local mirror.
 *
 * MIRROR — keep this 1:1 with the canonical implementation at
 *   platform/dauth/packages/shared/src/gateway-origin.ts
 *   platform/dauth/packages/shared/src/middleware/gateway-origin.middleware.ts
 *
 * Same rationale as the gateway's local mirror: the canonical shared
 * package is in a different workspace and pulling it in would expand the
 * dependency surface of a trust-critical service. The signer (gateway) and
 * verifier (here) cross-validate via a contract test at the shared package
 * level (`__tests__/gateway-origin.test.ts`).
 *
 * Any change to token shape, encoding, or signing algorithm MUST land in
 * all three files in the same commit, with the contract test passing.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'node:crypto';

export const GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';

interface GatewayOriginPayload {
  iat: number;
  exp: number;
  jti: string;
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  src: 'gateway';
  v: 1;
}

export interface GatewayOriginPrincipal {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    principal?: GatewayOriginPrincipal;
  }
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function timingSafeEq(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type VerifyFailureReason =
  | 'MISSING' | 'MALFORMED' | 'BAD_HMAC' | 'PAYLOAD_INVALID'
  | 'WRONG_SOURCE' | 'WRONG_VERSION' | 'EXPIRED' | 'NOT_YET_VALID' | 'REPLAYED';

export type VerifyResult =
  | { ok: true; principal: GatewayOriginPrincipal; payload: GatewayOriginPayload }
  | { ok: false; reason: VerifyFailureReason };

interface ReplayRegistry {
  seen(jti: string, expEpochSeconds: number, nowSeconds?: number): boolean;
}

function createReplayRegistry(): ReplayRegistry {
  const max = 10_000;
  const seenMap = new Map<string, number>();
  return {
    seen(jti, expEpochSeconds, nowSeconds) {
      const cutoff = nowSeconds ?? Math.floor(Date.now() / 1000);
      if (seenMap.size > max) {
        for (const [k, v] of seenMap) if (v < cutoff) seenMap.delete(k);
        while (seenMap.size > max) {
          const first = seenMap.keys().next().value as string | undefined;
          if (first === undefined) break;
          seenMap.delete(first);
        }
      }
      const prev = seenMap.get(jti);
      if (prev !== undefined && prev >= cutoff) return true;
      seenMap.set(jti, expEpochSeconds);
      return false;
    },
  };
}

const DEFAULT_REPLAY = createReplayRegistry();

export function verifyGatewayOrigin(
  rawToken: string | undefined | null,
  options: { secret: string; replayRegistry?: ReplayRegistry; clockSkewSeconds?: number; nowSeconds?: number },
): VerifyResult {
  if (!rawToken) return { ok: false, reason: 'MISSING' };
  const dot = rawToken.indexOf('.');
  if (dot <= 0 || dot === rawToken.length - 1) return { ok: false, reason: 'MALFORMED' };
  const payloadB64 = rawToken.slice(0, dot);
  const sigB64 = rawToken.slice(dot + 1);
  const expectedSig = crypto.createHmac('sha256', options.secret).update(payloadB64).digest();
  let providedSig: Buffer;
  try { providedSig = base64UrlDecode(sigB64); } catch { return { ok: false, reason: 'MALFORMED' }; }
  if (!timingSafeEq(providedSig, expectedSig)) return { ok: false, reason: 'BAD_HMAC' };

  let payload: GatewayOriginPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as GatewayOriginPayload;
  } catch { return { ok: false, reason: 'MALFORMED' }; }

  if (
    typeof payload !== 'object' || payload === null
    || typeof payload.sub !== 'string' || payload.sub.length === 0
    || typeof payload.email !== 'string'
    || typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
    || typeof payload.jti !== 'string' || payload.jti.length === 0
    || !Array.isArray(payload.roles)
    || typeof payload.tenantId !== 'string'
  ) return { ok: false, reason: 'PAYLOAD_INVALID' };
  if (payload.src !== 'gateway') return { ok: false, reason: 'WRONG_SOURCE' };
  if (payload.v !== 1) return { ok: false, reason: 'WRONG_VERSION' };

  const skew = options.clockSkewSeconds ?? 5;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now > payload.exp + skew) return { ok: false, reason: 'EXPIRED' };
  if (now + skew < payload.iat) return { ok: false, reason: 'NOT_YET_VALID' };

  const replay = options.replayRegistry ?? DEFAULT_REPLAY;
  if (replay.seen(payload.jti, payload.exp, now)) return { ok: false, reason: 'REPLAYED' };

  return {
    ok: true,
    payload,
    principal: { sub: payload.sub, tenantId: payload.tenantId, email: payload.email, roles: payload.roles },
  };
}

export interface RequireGatewayOriginOptions {
  resolveSecret?: () => string;
  resolveLegacyTrust?: () => boolean;
  replayRegistry?: ReplayRegistry;
}

/**
 * Pin `req.principal` from the verified gateway-origin token.
 *
 * Dual mode (Wave 1 rollout):
 *   - LEGACY_HEADER_TRUST=true  → MISSING token falls back to raw
 *     `x-user-*` / `x-tenant-id` headers (preserves pre-Wave-1 behavior).
 *   - LEGACY_HEADER_TRUST=false → MISSING token returns 401.
 *
 * In BOTH modes, present-but-invalid tokens (bad HMAC, expired, replayed,
 * malformed) return 401. The flag only controls the missing-token branch.
 */
export function requireGatewayOrigin(opts: RequireGatewayOriginOptions = {}): RequestHandler {
  const resolveSecret = opts.resolveSecret ?? (() => {
    const s = process.env.GATEWAY_ORIGIN_HMAC_SECRET;
    if (!s) throw new Error('[gateway-origin] GATEWAY_ORIGIN_HMAC_SECRET not set');
    return s;
  });
  const resolveLegacyTrust = opts.resolveLegacyTrust ?? (() => {
    const v = (process.env.LEGACY_HEADER_TRUST ?? 'true').toLowerCase();
    return v !== 'false' && v !== '0' && v !== 'no';
  });
  const replayRegistry = opts.replayRegistry ?? DEFAULT_REPLAY;

  return (req: Request, res: Response, next: NextFunction): void => {
    const rawToken = req.headers[GATEWAY_ORIGIN_HEADER] as string | undefined;
    const legacy = resolveLegacyTrust();

    if (!rawToken) {
      if (!legacy) {
        res.status(401).json({ error: 'GATEWAY_ORIGIN_REQUIRED', code: 'MISSING_GATEWAY_TOKEN' });
        return;
      }
      const sub = (req.headers['x-user-sub'] as string | undefined)
        ?? (req.headers['x-user-id'] as string | undefined);
      if (!sub) {
        res.status(401).json({ error: 'NO_CALLER', code: 'MISSING_PRINCIPAL' });
        return;
      }
      const email = (req.headers['x-user-email'] as string | undefined) ?? '';
      const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
      const rolesRaw = req.headers['x-user-roles'] as string | undefined;
      const roles = rolesRaw ? rolesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
      console.warn('[gateway-origin] LEGACY_HEADER_TRUST fallback', { path: req.originalUrl, sub });
      req.principal = { sub, tenantId, email, roles };
      next();
      return;
    }

    let secret: string;
    try { secret = resolveSecret(); }
    catch (err) {
      console.warn('[gateway-origin] secret resolution failed', (err as Error).message);
      res.status(500).json({ error: 'CONFIG_ERROR', code: 'NO_GATEWAY_SECRET' });
      return;
    }

    const result = verifyGatewayOrigin(rawToken, { secret, replayRegistry });
    if (result.ok !== true) {
      // Narrow to the failure branch explicitly. (`if (!result.ok)` confuses
      // TS narrowing under our base `"strictNullChecks": false` config.)
      const failed = result as Extract<typeof result, { ok: false }>;
      console.warn('[gateway-origin] verification failed', { reason: failed.reason, path: req.originalUrl });
      res.status(401).json({ error: 'GATEWAY_ORIGIN_INVALID', code: failed.reason });
      return;
    }
    req.principal = result.principal;
    next();
  };
}
