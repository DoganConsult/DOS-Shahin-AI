"use strict";
/**
 * DAuth — Principal context extraction.
 *
 * Converts an authenticated request (session.middleware has populated req.user)
 * into an ActorContext shape consumable by withTenantClient + downstream
 * services. Keeps the GUC-mapping concern out of every service call site.
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
function attachPrincipalContext(req, res, next) {
    const ctx = getPrincipalContextFromRequest(req);
    if (ctx) {
        res.locals.actorContext = ctx;
    }
    next();
}
//# sourceMappingURL=principal-context.middleware.js.map