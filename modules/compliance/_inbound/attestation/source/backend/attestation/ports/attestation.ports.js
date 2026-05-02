"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.validate = exports.setAuditData = exports.evaluateLifecycleTransition = exports.requirePermission = exports.authenticate = exports.tenantSchema = exports.safeQuery = void 0;
// @ts-nocheck
var db_1 = require("@dos/db");
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return db_1.safeQuery; } });
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
var module_auth_1 = require("@dos/module-auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return module_auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return module_auth_1.requirePermission; } });
var module_auth_2 = require("@dos/module-auth");
Object.defineProperty(exports, "evaluateLifecycleTransition", { enumerable: true, get: function () { return module_auth_2.evaluateLifecycleTransition; } });
var http_1 = require("@dos/platform-core/http");
Object.defineProperty(exports, "setAuditData", { enumerable: true, get: function () { return http_1.setAuditData; } });
var http_2 = require("@dos/platform-core/http");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return http_2.validate; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return http_2.asyncHandler; } });
//# sourceMappingURL=attestation.ports.js.map