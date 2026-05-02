"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantId = exports.requireSuperAdmin = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.optionalAuthenticate = exports.authenticate = exports.authPort = void 0;
exports.bindAuthPort = bindAuthPort;
const passthrough = (_req, _res, next) => next();
const passthroughFactory = (..._args) => passthrough;
exports.authPort = {
    authenticate: passthrough,
    optionalAuthenticate: passthrough,
    requirePermission: passthroughFactory,
    requireAnyPermission: passthroughFactory,
    requireAllPermissions: passthroughFactory,
    requireSuperAdmin: passthrough,
    requireTenantId: passthrough,
};
function bindAuthPort(impl) {
    Object.assign(exports.authPort, impl);
}
const authenticate = (req, res, next) => exports.authPort.authenticate(req, res, next);
exports.authenticate = authenticate;
const optionalAuthenticate = (req, res, next) => exports.authPort.optionalAuthenticate(req, res, next);
exports.optionalAuthenticate = optionalAuthenticate;
const requirePermission = (...perms) => exports.authPort.requirePermission(...perms);
exports.requirePermission = requirePermission;
const requireAnyPermission = (...perms) => exports.authPort.requireAnyPermission(...perms);
exports.requireAnyPermission = requireAnyPermission;
const requireAllPermissions = (...perms) => exports.authPort.requireAllPermissions(...perms);
exports.requireAllPermissions = requireAllPermissions;
const requireSuperAdmin = (req, res, next) => exports.authPort.requireSuperAdmin(req, res, next);
exports.requireSuperAdmin = requireSuperAdmin;
const requireTenantId = (req, res, next) => exports.authPort.requireTenantId(req, res, next);
exports.requireTenantId = requireTenantId;
//# sourceMappingURL=auth.port.js.map