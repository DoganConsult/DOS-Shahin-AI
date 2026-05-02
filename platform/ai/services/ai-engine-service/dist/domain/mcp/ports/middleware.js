let _authMiddleware = null;
export function setAuthMiddleware(middleware) {
    _authMiddleware = middleware;
}
export function getAuthMiddleware() {
    if (!_authMiddleware) {
        throw new Error('[DOS-AUTH] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
    }
    return _authMiddleware;
}
export const authenticate = (req, res, next) => {
    return getAuthMiddleware().authenticate(req, res, next);
};
export const optionalAuthenticate = (req, res, next) => {
    return getAuthMiddleware().optionalAuthenticate(req, res, next);
};
export function requirePermission(permission) {
    return (req, res, next) => getAuthMiddleware().requirePermission(permission)(req, res, next);
}
export function requireAnyPermission(...permissions) {
    return (req, res, next) => getAuthMiddleware().requireAnyPermission(...permissions)(req, res, next);
}
export const requireSuperAdmin = (req, res, next) => {
    return getAuthMiddleware().requireSuperAdmin(req, res, next);
};
/**
 * Standalone tenant-ID enforcement — pure request-shape validation.
 * Does not require auth-service; checks req.tenantId or x-tenant-id header.
 */
export function requireTenantId(req, res, next) {
    const tenantId = req.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
        return;
    }
    req.tenantId = tenantId;
    next();
}
//# sourceMappingURL=middleware.js.map