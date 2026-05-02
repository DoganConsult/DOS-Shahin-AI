import { Request, Response, NextFunction } from 'express';
import { logger } from '@dos/platform-core/observability';

/**
 * Tenant Guard — Extracted from monolith platform/dos/http/guards/tenant-guard.ts
 *
 * Ensures every request beyond public routes carries a valid tenant context.
 * The tenant is resolved from:
 *   1. x-tenant-id header (set by gateway or upstream auth middleware)
 *   2. req.user.tenantId (set by auth middleware after JWT verification)
 *
 * Fail-closed: if no tenant context can be determined the request is rejected 403.
 */

export interface TenantGuardOptions {
  /** Header name carrying the tenant identifier. Default: 'x-tenant-id' */
  header?: string;
  /** Route prefixes that bypass tenant requirement (e.g. /health, /api/auth/login). */
  publicPrefixes?: string[];
  /** When true, additionally verify the tenant exists via a lookup callback. */
  verify?: boolean;
  /** Optional callback to verify a tenant ID is active. Return true if valid. */
  tenantLookup?: (tenantId: string) => Promise<boolean>;
}

const DEFAULT_PUBLIC_PREFIXES = [
  '/health',
  '/ready',
  '/info',
  '/metrics',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/sso',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

/**
 * Defensive: tenantGuard can be called as either
 *   - a factory:    `router.use(tenantGuard({ header: '...' }))`
 *   - a middleware: `router.use(tenantGuard)`  ← previously hung 60s
 *
 * The factory form is canonical. The middleware form was a footgun:
 * Express invoked `tenantGuard(req, res, next)` so `req` ended up as
 * `options`, the function returned the inner middleware as a value
 * (Express ignores it), and `next()` was never called → request stalled.
 *
 * We detect a 3-arg call where the first arg looks like an Express
 * `req` (has `headers` and `path`) and run as middleware with default
 * options. This makes the legacy `router.use(tenantGuard)` callers
 * work safely while the canonical factory form remains unchanged.
 *
 * Fixes: bulk-tasks / process-tasks / approval-routing 60s hang
 * surfaced by Phase-2 DoD harness on workflow-service.
 */
export function tenantGuard(...args: unknown[]): any {
  // Direct middleware invocation: tenantGuard(req, res, next)
  if (
    args.length === 3 &&
    args[0] && typeof args[0] === 'object' && 'headers' in (args[0] as object) && 'path' in (args[0] as object) &&
    args[1] && typeof args[1] === 'object' && 'status' in (args[1] as object) &&
    typeof args[2] === 'function'
  ) {
    const [req, res, next] = args as [Request, Response, NextFunction];
    return tenantGuardImpl(undefined)(req, res, next);
  }
  // Factory invocation: tenantGuard(opts?) → middleware
  const options = args[0] as TenantGuardOptions | undefined;
  return tenantGuardImpl(options);
}

function tenantGuardImpl(options?: TenantGuardOptions) {
  const header = options?.header ?? 'x-tenant-id';
  const publicPrefixes = options?.publicPrefixes ?? DEFAULT_PUBLIC_PREFIXES;
  const verify = options?.verify ?? false;
  const tenantLookup = options?.tenantLookup;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip public routes
    const path = req.path.toLowerCase();
    for (const prefix of publicPrefixes) {
      if (path === prefix || path.startsWith(prefix + '/')) {
        return next();
      }
    }

    // Resolve tenant ID from header or authenticated user
    const headerTenantId = req.headers[header] as string | undefined;
    const userTenantId = (req as any).user?.tenantId;
    const tenantId = headerTenantId || userTenantId;

    if (!tenantId) {
      logger.warn('[tenant-guard] No tenant context found', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      res.status(403).json({
        error: 'Tenant context required',
        code: 'TENANT_CONTEXT_MISSING',
      });
      return;
    }

    // Cross-check: if both sources present, they must agree
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      logger.warn('[tenant-guard] Tenant mismatch between header and token', {
        headerTenantId,
        userTenantId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Tenant context mismatch',
        code: 'TENANT_CONTEXT_MISMATCH',
      });
      return;
    }

    // Optional: verify the tenant exists and is active
    if (verify && tenantLookup) {
      try {
        const valid = await tenantLookup(tenantId);
        if (!valid) {
          logger.warn('[tenant-guard] Tenant not found or inactive', { tenantId });
          res.status(403).json({
            error: 'Tenant not found or inactive',
            code: 'TENANT_INACTIVE',
          });
          return;
        }
      } catch (err: any) {
        logger.error('[tenant-guard] Tenant lookup failed', { tenantId, error: err?.message });
        res.status(503).json({
          error: 'Unable to verify tenant',
          code: 'TENANT_VERIFICATION_ERROR',
        });
        return;
      }
    }

    // Attach tenant ID to request for downstream consumption
    (req as any).tenantId = tenantId;
    if (!req.headers[header]) {
      req.headers[header] = tenantId;
    }

    next();
  };
}

/**
 * Per-tenant rate limiter key generator.
 * Use with createRateLimiter({ keyGenerator: perTenantKey() }) to enforce
 * rate limits scoped to each tenant rather than per-IP.
 */
export function perTenantKey(namespace = 'tenant') {
  return (req: Request): string => {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || 'unknown';
    return `${namespace}:${tenantId}`;
  };
}

/**
 * Per-tenant + per-IP composite key generator.
 * Limits each IP within a tenant separately.
 */
export function perTenantIpKey(namespace = 'tenant-ip') {
  return (req: Request): string => {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    return `${namespace}:${tenantId}:${ip}`;
  };
}
