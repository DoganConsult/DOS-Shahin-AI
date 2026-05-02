"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuditData = exports.asyncHandler = exports.validate = exports.requirePermission = exports.authenticate = exports.safeQuery = void 0;
exports.tenantSchema = tenantSchema;
// @ts-nocheck
var safe_query_1 = require("../../../shared/database/safe-query");
Object.defineProperty(exports, "safeQuery", { enumerable: true, get: function () { return safe_query_1.safeQuery; } });
function tenantSchema(tenantId) { return `tenant_${tenantId.replace(/-/g, '_')}`; }
var module_auth_1 = require("@dos/module-auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return module_auth_1.authenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return module_auth_1.requirePermission; } });
const validate = (schemas) => (req, _res, next) => {
    for (const [key, schema] of Object.entries(schemas)) {
        const source = key === 'body' ? req.body : key === 'query' ? req.query : req.params;
        const result = schema.safeParse(source);
        if (!result.success) {
            return next(result.error);
        }
        if (key === 'body')
            req.body = result.data;
    }
    next();
};
exports.validate = validate;
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.asyncHandler = asyncHandler;
var http_1 = require("@dos/platform-core/http");
Object.defineProperty(exports, "setAuditData", { enumerable: true, get: function () { return http_1.setAuditData; } });
//# sourceMappingURL=mobile.ports.js.map