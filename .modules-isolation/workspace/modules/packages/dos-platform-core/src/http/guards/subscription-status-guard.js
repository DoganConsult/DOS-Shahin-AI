"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSubscriptionLookup = setSubscriptionLookup;
exports.subscriptionStatusGuard = subscriptionStatusGuard;
exports.invalidateSubscriptionCache = invalidateSubscriptionCache;
exports.clearSubscriptionCache = clearSubscriptionCache;
const observability_1 = require("@dos/platform-core/observability");
/** In-memory cache for subscription info. */
const subscriptionCache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute
let _subscriptionLookup = null;
/**
 * Register the subscription lookup function at bootstrap time.
 */
function setSubscriptionLookup(fn) {
    _subscriptionLookup = fn;
}
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_ALLOWED = ['active', 'trial', 'grace'];
const DEFAULT_READ_ONLY = ['suspended'];
const DEFAULT_EXEMPT_PREFIXES = [
    '/health',
    '/ready',
    '/info',
    '/metrics',
    '/api/auth',
    '/api/billing',
    '/api/subscriptions',
    '/api/platform-admin',
];
function subscriptionStatusGuard(options) {
    const allowedStatuses = new Set(options?.allowedStatuses ?? DEFAULT_ALLOWED);
    const readOnlyStatuses = new Set(options?.readOnlyStatuses ?? DEFAULT_READ_ONLY);
    const exemptPrefixes = options?.exemptPrefixes ?? DEFAULT_EXEMPT_PREFIXES;
    const allowPlatformAdmin = options?.allowPlatformAdmin ?? true;
    return async (req, res, next) => {
        // Skip exempt routes
        const path = req.path.toLowerCase();
        for (const prefix of exemptPrefixes) {
            if (path === prefix || path.startsWith(prefix + '/')) {
                return next();
            }
        }
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            // No tenant context — let tenant-guard handle this
            return next();
        }
        // Platform admins bypass subscription checks
        if (allowPlatformAdmin) {
            const user = req.user;
            if (user?.role === 'platform_admin' || user?.isPlatformAdmin === true) {
                return next();
            }
        }
        const lookup = options?.subscriptionLookup || _subscriptionLookup;
        if (!lookup) {
            // No lookup registered — fail open in dev, closed in production
            if (process.env.NODE_ENV === 'production') {
                observability_1.logger.error('[subscription-guard] No subscription lookup registered — failing closed');
                res.status(503).json({
                    error: 'Subscription verification unavailable',
                    code: 'SUBSCRIPTION_GUARD_NOT_INITIALIZED',
                });
                return;
            }
            return next();
        }
        let info;
        // Check cache
        const cached = subscriptionCache.get(tenantId);
        if (cached && cached.expiresAt > Date.now()) {
            info = cached.info;
        }
        else {
            try {
                info = await lookup(tenantId);
                if (info) {
                    subscriptionCache.set(tenantId, { info, expiresAt: Date.now() + CACHE_TTL_MS });
                }
            }
            catch (err) {
                observability_1.logger.error('[subscription-guard] Subscription lookup failed', { tenantId, error: err?.message });
                res.status(503).json({
                    error: 'Unable to verify subscription status',
                    code: 'SUBSCRIPTION_VERIFICATION_ERROR',
                });
                return;
            }
        }
        if (!info) {
            observability_1.logger.warn('[subscription-guard] No subscription found for tenant', { tenantId });
            res.status(403).json({
                error: 'No active subscription found',
                code: 'SUBSCRIPTION_NOT_FOUND',
            });
            return;
        }
        // Full access statuses
        if (allowedStatuses.has(info.status)) {
            // Attach subscription info for downstream use
            req.subscription = info;
            return next();
        }
        // Read-only statuses — allow GET/HEAD/OPTIONS only
        if (readOnlyStatuses.has(info.status)) {
            if (READ_METHODS.has(req.method)) {
                req.subscription = info;
                res.setHeader('X-Subscription-Status', info.status);
                res.setHeader('X-Subscription-Mode', 'read-only');
                return next();
            }
            observability_1.logger.info('[subscription-guard] Write operation blocked — subscription suspended', {
                tenantId,
                status: info.status,
                method: req.method,
                path: req.path,
            });
            res.status(403).json({
                error: 'Subscription suspended — read-only access',
                code: 'SUBSCRIPTION_SUSPENDED',
                status: info.status,
            });
            return;
        }
        // Blocked statuses (expired, cancelled, or any unknown status)
        observability_1.logger.info('[subscription-guard] Access blocked — subscription not active', {
            tenantId,
            status: info.status,
            path: req.path,
        });
        res.status(403).json({
            error: `Subscription ${info.status} — access denied`,
            code: 'SUBSCRIPTION_BLOCKED',
            status: info.status,
        });
    };
}
/**
 * Invalidate subscription cache for a tenant (e.g. after payment or plan change).
 */
function invalidateSubscriptionCache(tenantId) {
    subscriptionCache.delete(tenantId);
}
/**
 * Clear all subscription cache entries.
 */
function clearSubscriptionCache() {
    subscriptionCache.clear();
}
//# sourceMappingURL=subscription-status-guard.js.map