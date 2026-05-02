"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenantId = exports.requirePermission = exports.authenticate = void 0;
exports.logAuthDecision = logAuthDecision;
exports.preventSelfApproval = preventSelfApproval;
var auth_1 = require("@dos/auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return auth_1.requirePermission; } });
Object.defineProperty(exports, "requireTenantId", { enumerable: true, get: function () { return auth_1.requireTenantId; } });
function logAuthDecision(...args) { }
function preventSelfApproval(...args) { return (_req, _res, next) => next(); }
//# sourceMappingURL=auth.port.js.map