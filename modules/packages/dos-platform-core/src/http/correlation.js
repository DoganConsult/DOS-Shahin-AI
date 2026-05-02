"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = void 0;
exports.correlationMiddleware = correlationMiddleware;
exports.getCorrelationId = getCorrelationId;
const crypto_1 = require("crypto");
const async_hooks_1 = require("async_hooks");
const HEADER = 'x-correlation-id';
exports.requestContext = new async_hooks_1.AsyncLocalStorage();
function correlationMiddleware() {
    return (req, res, next) => {
        const correlationId = req.headers[HEADER] || (0, crypto_1.randomUUID)();
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.user?.userId || req.user?.id;
        res.setHeader(HEADER, correlationId);
        req.correlationId = correlationId;
        exports.requestContext.run({ correlationId, tenantId, userId }, () => {
            next();
        });
    };
}
function getCorrelationId() {
    return exports.requestContext.getStore()?.correlationId;
}
//# sourceMappingURL=correlation.js.map