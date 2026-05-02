"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantId = exports.requireSuperAdmin = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.optionalAuthenticate = exports.authenticate = void 0;
exports.bindDauthShared = bindDauthShared;
/**
 * Foundation auth adapter.
 *
 * Re-exports the auth port middleware so existing route files keep their
 * import path stable. The real `@dos/dauth-shared` impl is bound by the
 * host service at boot via `bindDauthShared()` (dynamic import — keeps
 * the module standalone-typeable when the workspace package isn't linked).
 */
const auth_port_1 = require("../ports/auth.port");
var auth_port_2 = require("../ports/auth.port");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_port_2.authenticate; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return auth_port_2.optionalAuthenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return auth_port_2.requirePermission; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return auth_port_2.requireAnyPermission; } });
Object.defineProperty(exports, "requireAllPermissions", { enumerable: true, get: function () { return auth_port_2.requireAllPermissions; } });
Object.defineProperty(exports, "requireSuperAdmin", { enumerable: true, get: function () { return auth_port_2.requireSuperAdmin; } });
Object.defineProperty(exports, "requireTenantId", { enumerable: true, get: function () { return auth_port_2.requireTenantId; } });
async function bindDauthShared() {
    try {
        const mod = await import('@dos/dauth-shared').catch(() => null);
        if (!mod)
            return false;
        (0, auth_port_1.bindAuthPort)({
            authenticate: mod.authenticate,
            optionalAuthenticate: mod.optionalAuthenticate,
            requirePermission: mod.requirePermission,
            requireAnyPermission: mod.requireAnyPermission,
            requireAllPermissions: mod.requireAllPermissions,
            requireSuperAdmin: mod.requireSuperAdmin,
            requireTenantId: mod.requireTenantId,
        });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=auth.adapter.js.map