"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.optionalAuthenticate = exports.authenticate = void 0;
exports.setAuthMiddleware = setAuthMiddleware;
exports.getAuthMiddleware = getAuthMiddleware;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
// globalThis singleton — survives pnpm dual-instance module resolution
const GLOBAL_SDK_AUTH_KEY = Symbol.for('__dos_sdk_auth_middleware__');
function setAuthMiddleware(middleware) {
    globalThis[GLOBAL_SDK_AUTH_KEY] = middleware;
}
function getAuthMiddleware() {
    const mw = globalThis[GLOBAL_SDK_AUTH_KEY];
    if (!mw) {
        throw new Error('[DOS-SDK] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
    }
    return mw;
}
const authenticate = (req, res, next) => getAuthMiddleware().authenticate(req, res, next);
exports.authenticate = authenticate;
const optionalAuthenticate = (req, res, next) => getAuthMiddleware().optionalAuthenticate(req, res, next);
exports.optionalAuthenticate = optionalAuthenticate;
function requirePermission(permission) {
    return getAuthMiddleware().requirePermission(permission);
}
function requireAnyPermission(...permissions) {
    return getAuthMiddleware().requireAnyPermission(...permissions);
}
const requireSuperAdmin = (req, res, next) => getAuthMiddleware().requireSuperAdmin(req, res, next);
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=auth.js.map