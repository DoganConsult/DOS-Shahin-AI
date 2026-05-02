"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantQuery = tenantQuery;
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
const user_errors_1 = require("../../contracts/user-errors");
async function tenantQuery(req, text, params, opName) {
    const tenantId = req.tenantId;
    if (!tenantId) {
        throw new user_errors_1.UserServiceError('TENANT_CONTEXT_MISSING');
    }
    const start = Date.now();
    try {
        return await (0, database_port_1.withTenantClient)(tenantId, (c) => c.query(text, params));
    }
    finally {
        metrics_1.userMetrics.observeDb(opName ?? 'foundation.query', Date.now() - start);
    }
}
//# sourceMappingURL=_tenant-query.js.map