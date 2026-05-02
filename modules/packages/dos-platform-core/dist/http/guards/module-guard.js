"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setModuleLookup = setModuleLookup;
exports.moduleGuard = moduleGuard;
exports.invalidateModuleCache = invalidateModuleCache;
exports.clearModuleCache = clearModuleCache;
exports.registerProductToken = registerProductToken;
exports.registerProductKey = registerProductKey;
const observability_1 = require("@dos/platform-core/observability");
/** In-memory cache for module access (tenantId:moduleCode -> { result, expiresAt }). */
const moduleAccessCache = new Map();
const CACHE_TTL_MS = 30_000; // 30 seconds
let _moduleLookup = null;
/**
 * Register the module lookup function at bootstrap time.
 * Typically called from service-bootstrap after DB is ready.
 */
function setModuleLookup(fn) {
    _moduleLookup = fn;
}
function moduleGuard(moduleCode, options) {
    const allowPlatformAdmin = options?.allowPlatformAdmin ?? true;
    return async (req, res, next) => {
        const tenantId = req.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(403).json({
                error: 'Tenant context required for module access',
                code: 'TENANT_CONTEXT_MISSING',
            });
            return;
        }
        // Platform admins bypass module gating
        if (allowPlatformAdmin) {
            const user = req.user;
            if (user?.role === 'platform_admin' || user?.isPlatformAdmin === true) {
                return next();
            }
        }
        const lookup = options?.moduleLookup || _moduleLookup;
        if (!lookup) {
            // If no lookup is registered, fail open with a warning in non-production
            // and fail closed in production
            if (process.env.NODE_ENV === 'production') {
                observability_1.logger.error('[module-guard] No module lookup registered — failing closed', { moduleCode, tenantId });
                res.status(503).json({
                    error: 'Module access verification unavailable',
                    code: 'MODULE_GUARD_NOT_INITIALIZED',
                });
                return;
            }
            observability_1.logger.warn('[module-guard] No module lookup registered — allowing in non-production', { moduleCode, tenantId });
            return next();
        }
        // Check cache first
        const cacheKey = `${tenantId}:${moduleCode}`;
        const cached = moduleAccessCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            if (!cached.result) {
                res.status(403).json({
                    error: `Module '${moduleCode}' is not enabled for this tenant`,
                    code: 'MODULE_NOT_ENABLED',
                    module: moduleCode,
                });
                return;
            }
            return next();
        }
        try {
            const enabled = await lookup(tenantId, moduleCode);
            moduleAccessCache.set(cacheKey, { result: enabled, expiresAt: Date.now() + CACHE_TTL_MS });
            if (!enabled) {
                observability_1.logger.info('[module-guard] Module not enabled for tenant', { moduleCode, tenantId });
                res.status(403).json({
                    error: `Module '${moduleCode}' is not enabled for this tenant`,
                    code: 'MODULE_NOT_ENABLED',
                    module: moduleCode,
                });
                return;
            }
            next();
        }
        catch (err) {
            observability_1.logger.error('[module-guard] Module lookup failed', { moduleCode, tenantId, error: err?.message });
            res.status(503).json({
                error: 'Unable to verify module access',
                code: 'MODULE_VERIFICATION_ERROR',
            });
        }
    };
}
/**
 * Invalidate the module access cache for a tenant (e.g. after subscription change).
 */
function invalidateModuleCache(tenantId) {
    for (const key of moduleAccessCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
            moduleAccessCache.delete(key);
        }
    }
}
/**
 * Invalidate all module access cache entries.
 */
function clearModuleCache() {
    moduleAccessCache.clear();
}
const _productTokens = new Map();
const _productKeys = new Set();
function registerProductToken(token, productCode, label) {
    _productTokens.set(token, { productCode, label });
}
function registerProductKey(productKey) {
    _productKeys.add(productKey);
}
//# sourceMappingURL=module-guard.js.map