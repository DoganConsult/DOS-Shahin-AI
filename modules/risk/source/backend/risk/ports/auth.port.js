"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuditData = exports.evaluateLifecycleTransition = exports.requirePermission = exports.authenticate = void 0;
// @ts-nocheck
var module_auth_1 = require("@dos/module-auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return module_auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return module_auth_1.requirePermission; } });
var module_auth_2 = require("@dos/module-auth");
Object.defineProperty(exports, "evaluateLifecycleTransition", { enumerable: true, get: function () { return module_auth_2.evaluateLifecycleTransition; } });
var http_1 = require("@dos/platform-core/http");
Object.defineProperty(exports, "setAuditData", { enumerable: true, get: function () { return http_1.setAuditData; } });
//# sourceMappingURL=auth.port.js.map