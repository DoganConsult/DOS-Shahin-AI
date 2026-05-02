"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantGuard = tenantGuard;
exports.perTenantKey = perTenantKey;
exports.perTenantIpKey = perTenantIpKey;
const observability_1 = require("@dos/platform-core/observability");
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
function tenantGuard(...args) {
    // Direct middleware invocation: tenantGuard(req, res, next)
    if (args.length === 3 &&
        args[0] && typeof args[0] === 'object' && 'headers' in args[0] && 'path' in args[0] &&
        args[1] && typeof args[1] === 'object' && 'status' in args[1] &&
        typeof args[2] === 'function') {
        const [req, res, next] = args;
        return tenantGuardImpl(undefined)(req, res, next);
    }
    // Factory invocation: tenantGuard(opts?) → middleware
    const options = args[0];
    return tenantGuardImpl(options);
}
function tenantGuardImpl(options) {
    const header = options?.header ?? 'x-tenant-id';
    const publicPrefixes = options?.publicPrefixes ?? DEFAULT_PUBLIC_PREFIXES;
    const verify = options?.verify ?? false;
    const tenantLookup = options?.tenantLookup;
    return async (req, res, next) => {
        // Skip public routes
        const path = req.path.toLowerCase();
        for (const prefix of publicPrefixes) {
            if (path === prefix || path.startsWith(prefix + '/')) {
                return next();
            }
        }
        // Resolve tenant ID from header or authenticated user
        const headerTenantId = req.headers[header];
        const userTenantId = req.user?.tenantId;
        const tenantId = headerTenantId || userTenantId;
        if (!tenantId) {
            observability_1.logger.warn('[tenant-guard] No tenant context found', {
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
            observability_1.logger.warn('[tenant-guard] Tenant mismatch between header and token', {
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
                    observability_1.logger.warn('[tenant-guard] Tenant not found or inactive', { tenantId });
                    res.status(403).json({
                        error: 'Tenant not found or inactive',
                        code: 'TENANT_INACTIVE',
                    });
                    return;
                }
            }
            catch (err) {
                observability_1.logger.error('[tenant-guard] Tenant lookup failed', { tenantId, error: err?.message });
                res.status(503).json({
                    error: 'Unable to verify tenant',
                    code: 'TENANT_VERIFICATION_ERROR',
                });
                return;
            }
        }
        // Attach tenant ID to request for downstream consumption
        req.tenantId = tenantId;
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
function perTenantKey(namespace = 'tenant') {
    return (req) => {
        const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'unknown';
        return `${namespace}:${tenantId}`;
    };
}
/**
 * Per-tenant + per-IP composite key generator.
 * Limits each IP within a tenant separately.
 */
function perTenantIpKey(namespace = 'tenant-ip') {
    return (req) => {
        const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'unknown';
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        return `${namespace}:${tenantId}:${ip}`;
    };
}
//# sourceMappingURL=tenant-guard.js.map