"use strict";
/**
 * DAuth — Principal context extraction.
 *
 * Converts an authenticated request (session.middleware has populated req.user)
 * into an ActorContext shape consumable by withTenantClient + downstream
 * services. Keeps the GUC-mapping concern out of every service call site.
 *
 * Usage:
 *   import { getPrincipalContextFromRequest } from '@dos/dauth-shared';
 *   const ctx = getPrincipalContextFromRequest(req);
 *   await withTenantClient(tenantId, ctx, async (client) => { ... });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrincipalContextFromRequest = getPrincipalContextFromRequest;
exports.attachPrincipalContext = attachPrincipalContext;
const ALLOWED = new Set([
    'human',
    'agent',
    'service_account',
    'external',
]);
function normalizePrincipalType(raw) {
    if (typeof raw === 'string' && ALLOWED.has(raw)) {
        return raw;
    }
    // Backwards-compat: legacy JWTs may carry 'service'; coerce to service_account.
    if (raw === 'service')
        return 'service_account';
    return 'human';
}
function getPrincipalContextFromRequest(req) {
    const user = req.user;
    if (!user)
        return undefined;
    const principalType = normalizePrincipalType(user.principalType);
    const actorId = typeof user.actorId === 'string'
        ? user.actorId
        : typeof user.userId === 'string'
            ? user.userId
            : undefined;
    const userId = typeof user.userId === 'string' ? user.userId : undefined;
    return { principalType, actorId, userId };
}
/**
 * Express middleware: attaches ctx to res.locals.actorContext so downstream
 * handlers can call withTenantClient(tenantId, res.locals.actorContext, ...).
 */
function attachPrincipalContext(req, res, next) {
    const ctx = getPrincipalContextFromRequest(req);
    if (ctx) {
        res.locals.actorContext = ctx;
    }
    next();
}
//# sourceMappingURL=principal-context.middleware.js.map