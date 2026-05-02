"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnershipOf = exports.requireDauth = exports.requireSuperAdmin = exports.optionalAuthenticate = exports.authenticate = void 0;
exports.setAuthMiddleware = setAuthMiddleware;
exports.getAuthMiddleware = getAuthMiddleware;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.requireTenantId = requireTenantId;
exports.externalAuthGuard = externalAuthGuard;
exports.scopeGuard = scopeGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const platform_core_1 = require("@dos/platform-core");
// Use globalThis to survive pnpm dual-instance module resolution.
// When the bootstrap package and service code resolve @dos/auth to
// different physical paths, each gets its own module-scoped variables.
// globalThis ensures a single shared slot regardless of resolution path.
const GLOBAL_AUTH_KEY = Symbol.for('__dos_auth_middleware__');
function setAuthMiddleware(middleware) {
    globalThis[GLOBAL_AUTH_KEY] = middleware;
}
function getAuthMiddleware() {
    const mw = globalThis[GLOBAL_AUTH_KEY];
    if (!mw) {
        throw new Error('[DOS-AUTH] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
    }
    return mw;
}
const authenticate = (req, res, next) => {
    return getAuthMiddleware().authenticate(req, res, next);
};
exports.authenticate = authenticate;
const optionalAuthenticate = (req, res, next) => {
    return getAuthMiddleware().optionalAuthenticate(req, res, next);
};
exports.optionalAuthenticate = optionalAuthenticate;
function requirePermission(permission) {
    return (req, res, next) => getAuthMiddleware().requirePermission(permission)(req, res, next);
}
function requireAnyPermission(...permissions) {
    return (req, res, next) => getAuthMiddleware().requireAnyPermission(...permissions)(req, res, next);
}
const requireSuperAdmin = (req, res, next) => {
    return getAuthMiddleware().requireSuperAdmin(req, res, next);
};
exports.requireSuperAdmin = requireSuperAdmin;
/**
 * Standalone tenant-ID enforcement — pure request-shape validation.
 * Does not require auth-service; checks req.tenantId or x-tenant-id header.
 */
function requireTenantId(req, res, next) {
    const tenantId = req.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
        return;
    }
    req.tenantId = tenantId;
    next();
}
/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals, etc).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`. Sets `req.externalScope`.
 *
 * Canonical location for the DAuth external-scope pattern. Mirrors
 * services/auth-service/src/middleware/session.middleware.ts so modules and
 * other services can import it from @dos/auth/middleware without reaching into
 * a service package.
 */
function externalAuthGuard(allowedRoles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing authorization token' });
            return;
        }
        const token = header.slice(7);
        try {
            const secret = (0, platform_core_1.resolveJwtSigningSecret)('dos-auth:external-guard');
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const role = decoded.role;
            if (!role || !allowedRoles.includes(role)) {
                res.status(403).json({ error: `Role '${role}' is not permitted. Allowed: ${allowedRoles.join(', ')}` });
                return;
            }
            req.externalScope = {
                tenantId: decoded.tenantId,
                entityType: decoded.entityType,
                entityId: decoded.entityId,
                role,
                permissions: decoded.permissions ?? [],
            };
            req.tenantId = decoded.tenantId;
            next();
        }
        catch {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}
// Phase C — rich-context middleware variants. These reach the registered
// authz evaluator port directly (no factory closure dependency); services
// import them by name and use them on state-transition routes.
var canonical_middleware_1 = require("./canonical-middleware");
Object.defineProperty(exports, "requireDauth", { enumerable: true, get: function () { return canonical_middleware_1.requireDauth; } });
Object.defineProperty(exports, "requireOwnershipOf", { enumerable: true, get: function () { return canonical_middleware_1.requireOwnershipOf; } });
/**
 * Scope guard — ensures the external scope from externalAuthGuard matches
 * the requested entity id (e.g., req.params.id equals scope.entityId).
 */
function scopeGuard(paramName = 'id') {
    return (req, res, next) => {
        const scope = req.externalScope;
        if (!scope) {
            res.status(401).json({ error: 'No external scope context' });
            return;
        }
        const requested = req.params[paramName];
        if (requested && requested !== scope.entityId) {
            res.status(403).json({ error: 'Access denied: scope mismatch' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=middleware.js.map