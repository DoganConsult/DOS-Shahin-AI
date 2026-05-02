/**
 * Canonical JWT authentication middleware — extracted from
 * services/auth-service/src/middleware/session.middleware.ts.
 *
 * Factory function that creates an AuthMiddleware implementation
 * using local JWT verification (no HTTP round-trip to auth-service).
 *
 * Verification routing:
 *   1. Default path — resolve the TokenVerifier stack from
 *      `@dos/auth/token-verifier-factory`. Under `DAUTH_KEYCLOAK_ENFORCE=true`
 *      this places the Keycloak RS256 verifier as primary; otherwise the
 *      native HS256 verifier remains primary.
 *   2. Fallback path — when the factory has not been initialised yet
 *      (bootstrap race: service-bootstrap wires this middleware before
 *      `bootstrapDauth` runs) OR when the factory explicitly throws,
 *      drop to raw `jsonwebtoken.verify(token, getSecret())` with HS256.
 *   3. Legacy-token kill-switch — when `DAUTH_ACCEPT_NATIVE_HS256=false` AND
 *      the verified token's header `alg` is HS256 AND `DAUTH_KEYCLOAK_ENFORCE=true`,
 *      reject the request with 401 `LEGACY_TOKEN_REJECTED` even though the
 *      signature verified. This is the mechanism by which we cut over to
 *      Keycloak-only RS256 tokens without waiting for every DAuth-issued
 *      session to expire.
 *
 * Law 1: One canonical service per concern.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import type { AuthMiddleware } from './middleware';
import { getTokenVerifier } from './token-verifier-factory';
import type { MinimalAuthPayload } from './dauth-ports/token-verifier.port';
import {
  getAuthzEvaluator,
  type AuthzEvaluationContext,
  type AuthzDecision,
} from './dauth-ports/authz-evaluator.port';

// ── Types ──

export interface CanonicalMiddlewareOptions {
  /**
   * Override JWT secret resolution.  Defaults to process.env.JWT_SECRET
   * with a dev-only fallback of 'dev-secret'.
   */
  getSecret?: () => string;

  /**
   * Optional blacklist checker — returns true when JTI is revoked.
   * When omitted the middleware skips blacklist checking (suitable
   * for services without DB access to the token_blacklist table).
   */
  isBlacklisted?: (jti: string) => Promise<boolean>;
}

/** Internal: the shape returned by our per-request verify helper. */
interface InternalVerified {
  decoded: Record<string, unknown>;
  /** Signing algorithm advertised in the JWT header (e.g. 'HS256', 'RS256'). */
  alg: string;
  /** Which side of the stack verified this token. */
  source: 'native' | 'keycloak' | 'custom' | 'fallback-hs256';
}

function readBool(envKey: string): boolean {
  const v = process.env[envKey];
  if (!v) return false;
  const low = v.toLowerCase();
  return low === '1' || low === 'true';
}

/** Decode header without verification to inspect the `alg` field. */
function peekAlg(token: string): string {
  try {
    const decoded = jwt.decode(token, { complete: true }) as
      | { header?: { alg?: string } }
      | null;
    return decoded?.header?.alg ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ── Secret resolution (same logic as auth-service token.service.ts) ──

let _cachedSecret: string | null = null;

function defaultGetSecret(): string {
  if (_cachedSecret) return _cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (secret) { _cachedSecret = secret; return secret; }
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    _cachedSecret = 'dev-secret';
    return _cachedSecret;
  }
  throw new Error('[DOS-AUTH] JWT_SECRET environment variable is required');
}

// ── Blacklist — lazy-load from @dos/db if available ──

let _blacklistFn: ((jti: string) => Promise<boolean>) | null = null;

async function defaultIsBlacklisted(jti: string): Promise<boolean> {
  if (_blacklistFn) return _blacklistFn(jti);

  try {
    // Attempt to resolve token-blacklist via @dos/db + direct SQL
    const { safeQuery } = require('@dos/db');
    _blacklistFn = async (j: string) => {
      try {
        const result = await safeQuery(
          'SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() AND COALESCE(is_active, FALSE) = FALSE LIMIT 1',
          [j],
        );
        return result.rows.length > 0;
      } catch (err: unknown) {
        const msg = String((err as Error)?.message || err);
        // Infrastructure errors — allow the token (graceful degradation).
        // Services may lack SELECT on token_blacklist; that's expected
        // for non-auth services using shared middleware.
        if (
          msg.includes('does not exist') ||
          msg.includes('relation') ||
          msg.includes('connect') ||
          msg.includes('permission denied') ||
          msg.includes('insufficient privilege')
        ) {
          return false;
        }
        // Unknown error — log and fail-open (a single DB hiccup must not
        // lock out every user across the platform).
        const svcCode = process.env.SERVICE_CODE || 'unknown';
        console.warn(`[${svcCode}] blacklist check error for jti=${j.slice(0, 8)}…: ${msg.slice(0, 120)}`);
        return false;
      }
    };
    return _blacklistFn(jti);
  } catch {
    // @dos/db not available — skip blacklist check
    _blacklistFn = async () => false;
    return false;
  }
}

// ── Factory ──

export function createCanonicalAuthMiddleware(opts?: CanonicalMiddlewareOptions): AuthMiddleware {
  const getSecret = opts?.getSecret ?? defaultGetSecret;
  const isBlacklisted = opts?.isBlacklisted ?? defaultIsBlacklisted;

  /**
   * Port-aware verify. Resolves the TokenVerifier stack lazily per request
   * because `bootstrapDauth()` runs AFTER `createCanonicalAuthMiddleware()`
   * in every service's boot sequence — resolving at factory construction
   * would pin the stack to "uninitialised" forever.
   */
  async function verifyViaPortOrFallback(token: string): Promise<InternalVerified> {
    const alg = peekAlg(token);
    try {
      const stack = getTokenVerifier<MinimalAuthPayload>();
      const primaryResult = await stack.primary.verify(token);
      // Fire shadow verification best-effort; never block the request.
      if (stack.shadow) {
        stack.shadow
          .verify(token)
          .then((shadowResult) => {
            if (shadowResult.source !== primaryResult.source) {
              // Divergence telemetry only; decision-log write happens upstream
              // in writeAuthDecision. Keep this log low-noise.
              const svc = process.env.SERVICE_CODE || 'unknown';
              console.warn(`[${svc}] token shadow diverged primary=${primaryResult.source} shadow=${shadowResult.source}`);
            }
          })
          .catch(() => { /* silent — shadow must not impact the hot path */ });
      }
      return {
        decoded: primaryResult.payload as unknown as Record<string, unknown>,
        alg,
        source: primaryResult.source,
      };
    } catch (err) {
      // If the factory itself is uninitialised, fall through to HS256 direct
      // verification below. This preserves the legacy path for services that
      // load the middleware before `bootstrapDauth` runs.
      const msg = (err as Error)?.message ?? '';
      const factoryUninit = msg.includes('initTokenVerifierFactory');
      if (!factoryUninit) {
        // A real verification error — re-throw so the caller emits 401.
        throw err;
      }
    }
    // Fallback path — only reached when the factory was never initialised.
    const decoded = jwt.verify(token, getSecret()) as Record<string, unknown>;
    return { decoded, alg, source: 'fallback-hs256' };
  }

  /**
   * Legacy-token kill-switch. When ENFORCE=true and the verified token is
   * HS256 AND `DAUTH_ACCEPT_NATIVE_HS256` is not `true`, reject. This cuts
   * over all live sessions to Keycloak RS256 at flip time.
   */
  function legacyTokenRejected(v: InternalVerified): boolean {
    const enforce = readBool('DAUTH_KEYCLOAK_ENFORCE');
    if (!enforce) return false;
    const acceptLegacy = readBool('DAUTH_ACCEPT_NATIVE_HS256');
    if (acceptLegacy) return false;
    return v.alg === 'HS256';
  }

  /**
   * Extract the access token from the request. Prefers the
   * `Authorization: Bearer …` header (used by service-to-service callers
   * and legacy mobile clients) and falls back to the
   * `dos_access_token` httpOnly cookie set by the OIDC callback. The
   * cookie path was added so the SPA no longer has to receive the token
   * via a `?token=…` redirect query string — see
   * `setAccessTokenCookie` in services/auth-service/src/domain/identity/token.service.ts.
   */
  function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ') && header.length > 7) {
      return header.slice(7);
    }
    const cookieJar = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const fromCookie = cookieJar?.['dos_access_token'];
    return fromCookie && fromCookie.length > 0 ? fromCookie : null;
  }

  // ── authenticate ──
  const authenticate: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
      return;
    }
    try {
      const verified = await verifyViaPortOrFallback(token);
      if (legacyTokenRejected(verified)) {
        res.status(401).json({
          error: 'Legacy HS256 token rejected — re-authenticate via Keycloak',
          code: 'LEGACY_TOKEN_REJECTED',
        });
        return;
      }
      const decoded = verified.decoded;

      // Blacklist check
      const jti = decoded.jti as string | undefined;
      if (jti) {
        const revoked = await isBlacklisted(jti);
        if (revoked) {
          res.status(401).json({ error: 'Session revoked', code: 'SESSION_REVOKED' });
          return;
        }
      }

      // Enforce password change requirement
      if (decoded.mustChangePassword === true) {
        const url = req.originalUrl || '';
        const isAllowed = url.includes('/auth/change-password') || url.includes('/auth/logout');
        if (!isAllowed) {
          res.status(403).json({ error: 'Password change required before accessing this resource', code: 'PASSWORD_CHANGE_REQUIRED' });
          return;
        }
      }

      // Enforce tenant isolation
      const resolvedTenantId = (req as any).resolvedTenantId;
      if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
        res.status(403).json({ error: 'Tenant does not match host', code: 'TENANT_MISMATCH' });
        return;
      }

      // Normalize userId
      if (!decoded.userId && decoded.id) decoded.userId = decoded.id;
      decoded.principalType = decoded.principalType ?? 'human';

      req.user = decoded as any;
      req.tenantId = (resolvedTenantId ?? decoded.tenantId) as string;
      next();
    } catch (err: unknown) {
      const isExpired = (err as Error)?.message?.includes('expired');
      res.status(401).json({
        error: isExpired ? 'Token expired' : 'Invalid or expired token',
        code: isExpired ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN',
      });
    }
  };

  // ── optionalAuthenticate ──
  const optionalAuthenticate: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }
    try {
      const verified = await verifyViaPortOrFallback(token);
      if (legacyTokenRejected(verified)) {
        // On optional routes we still reject legacy tokens when ENFORCE is on
        // — it's a signal that the caller is stuck on a pre-cutover session
        // and must re-auth before any authenticated feature works.
        res.status(401).json({
          error: 'Legacy HS256 token rejected — re-authenticate via Keycloak',
          code: 'LEGACY_TOKEN_REJECTED',
        });
        return;
      }
      const decoded = verified.decoded;

      const jti = decoded.jti as string | undefined;
      if (jti) {
        const revoked = await isBlacklisted(jti);
        if (revoked) {
          res.status(401).json({ error: 'Session revoked', code: 'SESSION_REVOKED' });
          return;
        }
      }

      const resolvedTenantId = (req as any).resolvedTenantId;
      if (resolvedTenantId != null && decoded.tenantId !== resolvedTenantId) {
        res.status(403).json({ error: 'Tenant does not match host', code: 'TENANT_MISMATCH' });
        return;
      }

      if (!decoded.userId && decoded.id) decoded.userId = decoded.id;
      decoded.principalType = decoded.principalType ?? 'human';

      req.user = decoded as any;
      req.tenantId = (resolvedTenantId ?? decoded.tenantId) as string;
    } catch {
      // Invalid/expired token on optional routes — treat as unauthenticated
    }
    next();
  };

  // ── helpers ──
  function buildEvalContext(req: Request, permission: string): AuthzEvaluationContext | null {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) return null;
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);
    return {
      userId: (user.userId ?? user.id ?? '') as string,
      tenantId: (req.tenantId ?? user.tenantId ?? '') as string,
      role: (user.role ?? '') as string,
      roles: (user.roles as string[] | undefined) ?? undefined,
      isSuperAdmin: user.is_super_admin === true || user.isSuperAdmin === true,
      permissionCode: permission,
      ip: req.ip,
      path: req.path,
      attributes: { permissions: (user.permissions as string[] | undefined) ?? [] },
      correlationId,
    };
  }

  function shortCircuitOwnerOrAdmin(user: Record<string, unknown>): boolean {
    if (user.is_super_admin === true || user.isSuperAdmin === true) return true;
    if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true) return true;
    return false;
  }

  function denyResponse(res: Response, verdict: AuthzDecision, fallbackMsg: string): void {
    const status = verdict.decision === 'pending_approval' ? 202 : 403;
    res.status(status).json({
      error: verdict.reason ?? fallbackMsg,
      code: verdict.reasonCode ?? 'FORBIDDEN',
      decision: verdict.decision,
      correlationId: verdict.correlationId,
      source: verdict.source,
    });
  }

  // ── requirePermission ──
  // Builds an AuthzEvaluationContext from the request and delegates the
  // decision to the registered evaluator port. The default port is a
  // legacy JWT-claim wildcard match (preserves prior behavior); when
  // dauth-core's bootstrap registers its native evaluator, this becomes
  // the entry point to the full 14-step pipeline (membership, ABAC, SoD,
  // ReBAC, delegation, lifecycle, ledger write).
  function requirePermission(permission: string): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = req.user as Record<string, unknown> | undefined;
      if (!user) {
        res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
        return;
      }
      // Owner / super-admin fast path — short-circuits before the evaluator
      // for parity with the original middleware. Native evaluator still
      // logs these via its own super-admin step when invoked directly.
      if (shortCircuitOwnerOrAdmin(user)) { next(); return; }

      const ctx = buildEvalContext(req, permission);
      if (!ctx) {
        res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
        return;
      }

      try {
        const verdict = await getAuthzEvaluator().evaluate(ctx);
        if (verdict.decision === 'allow') { next(); return; }
        denyResponse(res, verdict, `Insufficient permissions. Required: ${permission}`);
      } catch (err) {
        // Hard-fail closed: any evaluator error is a deny, never a leak.
        res.status(503).json({
          error: 'Authorization evaluator failed',
          code: 'AUTHZ_EVALUATOR_ERROR',
          detail: err instanceof Error ? err.message : 'unknown',
        });
      }
    };
  }

  // ── requireAnyPermission ──
  // Calls the evaluator once per candidate permission and allows on the
  // first `allow`. Short-circuits on owner/super-admin like requirePermission.
  function requireAnyPermission(...permissions: string[]): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = req.user as Record<string, unknown> | undefined;
      if (!user) {
        res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
        return;
      }
      if (shortCircuitOwnerOrAdmin(user)) { next(); return; }

      const evaluator = getAuthzEvaluator();
      let lastVerdict: AuthzDecision | null = null;
      try {
        for (const perm of permissions) {
          const ctx = buildEvalContext(req, perm);
          if (!ctx) {
            res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
            return;
          }
          const verdict = await evaluator.evaluate(ctx);
          if (verdict.decision === 'allow') { next(); return; }
          lastVerdict = verdict;
        }
        if (lastVerdict) {
          denyResponse(res, lastVerdict, `Insufficient permissions. Required one of: ${permissions.join(' | ')}`);
        } else {
          res.status(403).json({ error: 'No permissions specified', code: 'FORBIDDEN' });
        }
      } catch (err) {
        res.status(503).json({
          error: 'Authorization evaluator failed',
          code: 'AUTHZ_EVALUATOR_ERROR',
          detail: err instanceof Error ? err.message : 'unknown',
        });
      }
    };
  }

  // ── requireSuperAdmin ──
  const requireSuperAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }
    if (user.is_super_admin !== true) {
      res.status(403).json({ error: 'Super admin access required', code: 'NOT_SUPER_ADMIN' });
      return;
    }
    next();
  };

  return {
    authenticate,
    optionalAuthenticate,
    requirePermission,
    requireAnyPermission,
    requireSuperAdmin,
  };
}

// ── Phase C: rich-context middleware variants ─────────────────────────────
// These do NOT live inside the createCanonicalMiddleware() factory because
// they have no closure dependencies (the authz evaluator is resolved per-call
// from the global registry). State-transition routes use these to pass
// lifecycle / ownership / scope context into the 14-step pipeline that
// `requirePermission(permission)` cannot express.

export interface RequireDauthOptions {
  /** Permission code, e.g. 'risk.record.approve' */
  permission: string;
  /** Module bucket — used by ABAC and entitlement checks. */
  moduleCode?: string;
  /** Entity type the action targets, e.g. 'risk', 'policy', 'invoice'. */
  entityType?: string;
  /**
   * Path-param name carrying the entity id. The middleware reads
   * `req.params[entityIdParam]` at request time. If unset, no entity id is
   * forwarded to the evaluator.
   */
  entityIdParam?: string;
  /** Authority tier required (e.g. 'L2', 'manager'). */
  authorityRequired?: string;
  /** Lifecycle transition `from` state. */
  lifecycleFromState?: string;
  /** Lifecycle transition `to` state. */
  lifecycleToState?: string;
  /** Free-form ABAC attributes — merged onto the evaluation context. */
  attributes?: Record<string, unknown>;
}

/**
 * `requireDauth(...)` — explicit-context authorization middleware.
 *
 * Usage:
 *   router.post('/policies/:id/approve',
 *     authenticate,
 *     requireTenantId,
 *     requireDauth({
 *       permission: 'policy.record.approve',
 *       moduleCode: 'policy',
 *       entityType: 'policy',
 *       entityIdParam: 'id',
 *       lifecycleFromState: 'submitted',
 *       lifecycleToState: 'approved',
 *       authorityRequired: 'L2',
 *     }),
 *     handler);
 *
 * The evaluator port resolves at request time, so services that load
 * dauth-core get the full 14-step pipeline; services that don't get the
 * legacy fallback. Same fail-closed behavior as `requirePermission`.
 */
export function requireDauth(opts: RequireDauthOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }
    // Super-admin / owner short-circuit consistent with requirePermission.
    if (user.is_super_admin === true || user.isSuperAdmin === true) { next(); return; }
    if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true) { next(); return; }

    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);
    const entityId =
      opts.entityIdParam && req.params ? req.params[opts.entityIdParam] : undefined;

    const ctx: AuthzEvaluationContext = {
      userId: (user.userId ?? user.id ?? '') as string,
      tenantId: (req.tenantId ?? user.tenantId ?? '') as string,
      role: (user.role ?? '') as string,
      roles: (user.roles as string[] | undefined) ?? undefined,
      isSuperAdmin: false,
      permissionCode: opts.permission,
      moduleCode: opts.moduleCode,
      entityType: opts.entityType,
      entityId,
      authorityRequired: opts.authorityRequired,
      lifecycleFromState: opts.lifecycleFromState,
      lifecycleToState: opts.lifecycleToState,
      ip: req.ip,
      path: req.path,
      attributes: {
        ...(opts.attributes ?? {}),
        permissions: (user.permissions as string[] | undefined) ?? [],
      },
      correlationId,
    };

    try {
      const verdict = await getAuthzEvaluator().evaluate(ctx);
      if (verdict.decision === 'allow') { next(); return; }
      const status = verdict.decision === 'pending_approval' ? 202 : 403;
      res.status(status).json({
        error: verdict.reason ?? `Insufficient permissions. Required: ${opts.permission}`,
        code: verdict.reasonCode ?? 'FORBIDDEN',
        decision: verdict.decision,
        correlationId: verdict.correlationId,
        source: verdict.source,
      });
    } catch (err) {
      res.status(503).json({
        error: 'Authorization evaluator failed',
        code: 'AUTHZ_EVALUATOR_ERROR',
        detail: err instanceof Error ? err.message : 'unknown',
      });
    }
  };
}

export interface RequireOwnershipOptions {
  permission: string;
  entityType: string;
  entityIdParam: string;
  moduleCode?: string;
}

/**
 * `requireOwnershipOf(...)` — convenience wrapper that pre-fills
 * `ownershipRequired: true` so the evaluator's ABAC step enforces
 * actor-must-own-entity. The native evaluator reads ownership from
 * `dos.ownership_mappings` (Foundation) and the entity's owner column.
 */
export function requireOwnershipOf(opts: RequireOwnershipOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }
    if (user.is_super_admin === true || user.isSuperAdmin === true) { next(); return; }
    if (user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true) { next(); return; }

    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined);
    const ctx: AuthzEvaluationContext = {
      userId: (user.userId ?? user.id ?? '') as string,
      tenantId: (req.tenantId ?? user.tenantId ?? '') as string,
      role: (user.role ?? '') as string,
      roles: (user.roles as string[] | undefined) ?? undefined,
      permissionCode: opts.permission,
      moduleCode: opts.moduleCode,
      entityType: opts.entityType,
      entityId: req.params?.[opts.entityIdParam],
      ownershipRequired: true,
      ip: req.ip,
      path: req.path,
      attributes: { permissions: (user.permissions as string[] | undefined) ?? [] },
      correlationId,
    };
    try {
      const verdict = await getAuthzEvaluator().evaluate(ctx);
      if (verdict.decision === 'allow') { next(); return; }
      res.status(403).json({
        error: verdict.reason ?? 'Ownership required',
        code: verdict.reasonCode ?? 'NOT_OWNER',
        decision: verdict.decision,
        correlationId: verdict.correlationId,
        source: verdict.source,
      });
    } catch (err) {
      res.status(503).json({
        error: 'Authorization evaluator failed',
        code: 'AUTHZ_EVALUATOR_ERROR',
        detail: err instanceof Error ? err.message : 'unknown',
      });
    }
  };
}
