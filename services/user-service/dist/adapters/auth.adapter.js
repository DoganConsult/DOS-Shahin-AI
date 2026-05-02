"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnershipOf = exports.requireDauth = exports.requireTenantId = exports.requireSuperAdmin = exports.requireAnyPermission = exports.requirePermission = exports.optionalAuthenticate = exports.authenticate = void 0;
/**
 * Auth adapter — thin re-export from @dos/auth canonical middleware.
 * The bootstrap wires the canonical JWT middleware automatically via
 * setAuthMiddleware(). All services share the same verification logic:
 * local jwt.verify + DB blacklist check + tenant isolation.
 */
var dauth_shared_1 = require("@dos/dauth-shared");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return dauth_shared_1.authenticate; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return dauth_shared_1.optionalAuthenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return dauth_shared_1.requirePermission; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return dauth_shared_1.requireAnyPermission; } });
Object.defineProperty(exports, "requireSuperAdmin", { enumerable: true, get: function () { return dauth_shared_1.requireSuperAdmin; } });
Object.defineProperty(exports, "requireTenantId", { enumerable: true, get: function () { return dauth_shared_1.requireTenantId; } });
Object.defineProperty(exports, "requireDauth", { enumerable: true, get: function () { return dauth_shared_1.requireDauth; } });
Object.defineProperty(exports, "requireOwnershipOf", { enumerable: true, get: function () { return dauth_shared_1.requireOwnershipOf; } });
//# sourceMappingURL=auth.adapter.js.map