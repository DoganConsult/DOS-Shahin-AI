"use strict";
// ============================================
// Shahin — Monte Carlo Simulation Service
// Runs risk simulations with configurable iterations
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSimulation = runSimulation;
const database_port_1 = require("../../ports/database.port");
const MAX_ITERATIONS = 10000;
const TIMEOUT_MS = 5000;
async function runSimulation(tenantId, riskId, iterations = 1000) {
    const result = await (0, database_port_1.safeQuery)("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
//# sourceMappingURL=monte-carlo.service.js.map