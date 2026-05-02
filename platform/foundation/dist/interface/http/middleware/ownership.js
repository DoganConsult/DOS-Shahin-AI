"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAdminRole = hasAdminRole;
exports.requireSelfOrAdmin = requireSelfOrAdmin;
exports.requireAdmin = requireAdmin;
const user_errors_1 = require("../../../contracts/user-errors");
const ADMIN_ROLES = new Set(['admin', 'user_admin', 'super_admin']);
function actorRoles(req) {
    const u = req.user;
    const out = new Set();
    if (u?.role)
        out.add(u.role);
    for (const r of u?.roles ?? [])
        out.add(r);
    return out;
}
function hasAdminRole(req) {
    const roles = actorRoles(req);
    for (const r of ADMIN_ROLES)
        if (roles.has(r))
            return true;
    return false;
}
/**
 * Applied to routes of shape /users/:id/... — allows if param id === current
 * user id OR current user has admin role.
 */
function requireSelfOrAdmin(paramName = 'id') {
    return (req, res, next) => {
        const targetId = req.params[paramName];
        const actorId = req.user?.userId;
        if (targetId && actorId && targetId === actorId)
            return next();
        if (hasAdminRole(req))
            return next();
        next(new user_errors_1.UserServiceError('UNAUTHORIZED_PROFILE_UPDATE', undefined, {
            target: targetId, actor: actorId,
        }));
    };
}
function requireAdmin() {
    return (req, _res, next) => {
        if (hasAdminRole(req))
            return next();
        next(new user_errors_1.UserServiceError('UNAUTHORIZED_PROFILE_UPDATE', undefined, {
            actor: req.user?.userId, reason: 'admin_required',
        }));
    };
}
//# sourceMappingURL=ownership.js.map