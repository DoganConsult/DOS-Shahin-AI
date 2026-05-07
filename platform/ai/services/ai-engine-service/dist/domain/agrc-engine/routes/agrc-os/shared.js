/**
 * Shared rate limiters and config for AGRC-OS sub-routers.
 * Used by all domain route files under agrc-os/ so limiters are defined once.
 */
import { rateLimiter } from '../../ports/middleware.port.js';
export const heavyOpLimiter = rateLimiter({
    windowMs: 60_000,
    maxRequests: 5,
    namespace: 'agrc-heavy',
    keyGenerator: (req) => req.tenantId || req.ip || 'any',
});
export const writeLimiter = rateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
    namespace: 'agrc-write',
    keyGenerator: (req) => req.tenantId || req.ip || 'any',
});
export const webhookLimiter = rateLimiter({
    windowMs: 60_000,
    maxRequests: 200,
    namespace: 'agrc-webhook',
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip || 'any',
});
//# sourceMappingURL=shared.js.map