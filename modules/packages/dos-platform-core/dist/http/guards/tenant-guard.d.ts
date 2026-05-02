import { Request } from 'express';
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
export declare function tenantGuard(...args: unknown[]): any;
/**
 * Per-tenant rate limiter key generator.
 * Use with createRateLimiter({ keyGenerator: perTenantKey() }) to enforce
 * rate limits scoped to each tenant rather than per-IP.
 */
export declare function perTenantKey(namespace?: string): (req: Request) => string;
/**
 * Per-tenant + per-IP composite key generator.
 * Limits each IP within a tenant separately.
 */
export declare function perTenantIpKey(namespace?: string): (req: Request) => string;
