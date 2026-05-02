"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.evaluateLifecycleTransition = exports.tenantSchema = exports.safeQuery = exports.setAuditData = exports.asyncHandler = exports.validate = exports.requirePermission = exports.authenticate = void 0;
var module_auth_1 = require("@dos/module-auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return module_auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return module_auth_1.requirePermission; } });
var http_1 = require("@dos/platform-core/http");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return http_1.validate; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return http_1.asyncHandler; } });
Object.defineProperty(exports, "setAuditData", { enumerable: true, get: function () { return http_1.setAuditData; } });
var db_1 = require("@dos/db");
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
const evaluateLifecycleTransition = async (..._args) => ({ allowed: true });
exports.evaluateLifecycleTransition = evaluateLifecycleTransition;
const emitEvent = async (..._args) => { };
exports.emitEvent = emitEvent;
//# sourceMappingURL=playbooks.ports.js.map