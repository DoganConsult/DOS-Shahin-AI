"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserEmailVerified = exports.evaluateLifecycleTransition = exports.requireTenantId = exports.requirePermission = exports.authenticate = void 0;
// Top-level auth port barrel. Pattern matches modules/onboarding/source/ports/auth.port.ts.
// Module services import via dynamic `await import('../../../ports/auth.port.js')`.
var module_auth_1 = require("@dos/module-auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return module_auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return module_auth_1.requirePermission; } });
Object.defineProperty(exports, "requireTenantId", { enumerable: true, get: function () { return module_auth_1.requireTenantId; } });
var module_auth_2 = require("@dos/module-auth");
Object.defineProperty(exports, "evaluateLifecycleTransition", { enumerable: true, get: function () { return module_auth_2.evaluateLifecycleTransition; } });
Object.defineProperty(exports, "isUserEmailVerified", { enumerable: true, get: function () { return module_auth_2.isUserEmailVerified; } });
