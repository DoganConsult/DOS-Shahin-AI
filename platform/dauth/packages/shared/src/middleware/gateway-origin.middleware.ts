/**
 * `requireGatewayOrigin` — Express middleware that verifies the
 * `x-dos-gateway-token` HMAC signed by the API gateway, pins the verified
 * identity onto `req.principal`, and (for back-compat) syncs `req.user` /
 * `req.tenantId` so existing code that reads those fields continues to work.
 *
 * Dual mode (Wave 1 rollout):
 *   - LEGACY_HEADER_TRUST=true  → MISSING token falls back to raw
 *     `x-user-*` / `x-tenant-id` headers (preserves pre-Wave-1 behavior).
 *     Logs a warning every fallback so we can verify cutover progress.
 *   - LEGACY_HEADER_TRUST=false → MISSING token returns 401. This is the
 *     terminal Wave-1 state.
 *
 * In BOTH modes, a token that is present-but-invalid (bad HMAC, expired,
 * replayed, malformed) returns 401. Fail-closed always. The flag only
 * controls the missing-token branch.
 *
 * Required env:
 *   GATEWAY_ORIGIN_HMAC_SECRET — ≥ 32 chars. Same value the gateway uses to
 *                                sign. Rotated independently from JWT key.
 *
 * Optional env:
 *   LEGACY_HEADER_TRUST          — 'true' | 'false' (default: 'true' until
 *                                  per-service cutover lands).
 *   GATEWAY_ORIGIN_CLOCK_SKEW_S  — clock-skew tolerance, default 5.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  GATEWAY_ORIGIN_HEADER,
  createInMemoryReplayRegistry,
  verifyGatewayOrigin,
  type ReplayRegistry,
} from '../gateway-origin';
import type {} from '../express-augment';

export interface RequireGatewayOriginOptions {
  /**
   * Override the secret resolver. By default reads
   * `GATEWAY_ORIGIN_HMAC_SECRET` from the environment.
   */
  resolveSecret?: () => string;
  /**
   * Override the dual-mode flag. By default reads `LEGACY_HEADER_TRUST`
   * from the environment.
   */
  resolveLegacyTrust?: () => boolean;
  /**
   * Replay registry. Default: process-wide in-memory registry. Pass a
   * Redis-backed registry in multi-instance deployments.
   */
  replayRegistry?: ReplayRegistry;
  /** Clock-skew tolerance (seconds). Default: env or 5. */
  clockSkewSeconds?: number;
  /** Inject a logger for tests. */
  logger?: { info: (msg: string, meta?: unknown) => void; warn: (msg: string, meta?: unknown) => void };
}

const DEFAULT_REPLAY = createInMemoryReplayRegistry();

function legacyHeadersToPrincipal(req: Request): { sub: string; tenantId: string; email: string; roles: string[] } | null {
  const sub = (req.headers['x-user-sub'] as string | undefined)
    ?? (req.headers['x-user-id'] as string | undefined);
  if (!sub) return null;
  const email = (req.headers['x-user-email'] as string | undefined) ?? '';
  const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? '';
  const rolesRaw = req.headers['x-user-roles'] as string | undefined;
  const roles = rolesRaw ? rolesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return { sub, tenantId, email, roles };
}

export function requireGatewayOrigin(
  options: RequireGatewayOriginOptions = {},
): RequestHandler {
  const resolveSecret = options.resolveSecret ?? (() => {
    const s = process.env.GATEWAY_ORIGIN_HMAC_SECRET;
    if (!s) {
      throw new Error('[gateway-origin] GATEWAY_ORIGIN_HMAC_SECRET is not set');
    }
    return s;
  });
  const resolveLegacyTrust = options.resolveLegacyTrust ?? (() => {
    const v = (process.env.LEGACY_HEADER_TRUST ?? 'true').toLowerCase();
    return v !== 'false' && v !== '0' && v !== 'no';
  });
  const replayRegistry = options.replayRegistry ?? DEFAULT_REPLAY;
  const clockSkew = options.clockSkewSeconds
    ?? (process.env.GATEWAY_ORIGIN_CLOCK_SKEW_S ? Number(process.env.GATEWAY_ORIGIN_CLOCK_SKEW_S) : 5);
  const log = options.logger ?? {
    info: (m: string, meta?: unknown) => console.info(m, meta ?? ''),
    warn: (m: string, meta?: unknown) => console.warn(m, meta ?? ''),
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const rawToken = req.headers[GATEWAY_ORIGIN_HEADER] as string | undefined;
    const legacy = resolveLegacyTrust();

    if (!rawToken) {
      if (!legacy) {
        res.status(401).json({ error: 'GATEWAY_ORIGIN_REQUIRED', code: 'MISSING_GATEWAY_TOKEN' });
        return;
      }
      // Legacy fallback (Wave 1 rollout in progress).
      const p = legacyHeadersToPrincipal(req);
      if (!p) {
        res.status(401).json({ error: 'NO_CALLER', code: 'MISSING_PRINCIPAL' });
        return;
      }
      log.warn('[gateway-origin] LEGACY_HEADER_TRUST fallback', {
        path: req.originalUrl,
        sub: p.sub,
      });
      req.principal = p;
      // Sync legacy fields for code that hasn't been migrated yet.
      req.tenantId = p.tenantId || req.tenantId;
      next();
      return;
    }

    let secret: string;
    try {
      secret = resolveSecret();
    } catch (err) {
      log.warn('[gateway-origin] secret resolution failed', err);
      res.status(500).json({ error: 'CONFIG_ERROR', code: 'NO_GATEWAY_SECRET' });
      return;
    }

    const result = verifyGatewayOrigin(rawToken, {
      secret,
      replayRegistry,
      clockSkewSeconds: clockSkew,
    });

    if (!result.ok) {
      const failure = result as { ok: false; reason: string; detail?: string };
      log.warn('[gateway-origin] verification failed', {
        reason: failure.reason,
        path: req.originalUrl,
      });
      res.status(401).json({ error: 'GATEWAY_ORIGIN_INVALID', code: failure.reason });
      return;
    }

    req.principal = result.principal;
    // Back-compat for code that reads `req.tenantId` and `req.user`.
    req.tenantId = result.principal.tenantId || undefined;
    if (!req.user) {
      // Minimal user shape consumers expect; full user resolution still
      // happens via `authenticate` for protected routes that need DB user.
      req.user = {
        userId: result.principal.sub,
        email: result.principal.email,
        roles: result.principal.roles,
        // role/role_code intentionally undefined — permission checks must
        // not rely on the gateway-origin token alone for role mapping.
      } as Express.Request['user'];
    }
    next();
  };
}
