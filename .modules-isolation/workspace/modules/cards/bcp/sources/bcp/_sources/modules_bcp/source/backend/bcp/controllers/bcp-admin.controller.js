"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleConfig = getModuleConfig;
exports.updateModuleConfig = updateModuleConfig;
exports.reseedModule = reseedModule;
exports.getModuleHealth = getModuleHealth;
exports.getReadinessAnalytics = getReadinessAnalytics;
exports.getTestingOverdue = getTestingOverdue;
exports.reindexModule = reindexModule;
exports.backfillModule = backfillModule;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const bcp_seed_1 = require("../data/bcp-seed");
const database_port_1 = require("../ports/database.port");
const bcpQuery = __importStar(require("../repositories/bcp-query.repo"));
const bcp_constants_1 = require("../data/bcp-constants");
async function getModuleConfig(req, res) {
    const seedData = (0, bcp_seed_1.getBcpSeedData)();
    res.json((0, module_sdk_1.ok)({ moduleCode: 'bcp', config: seedData.defaultConfigs }, req));
}
async function updateModuleConfig(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'bcp_config', entityId: 'bcp' });
    res.json((0, module_sdk_1.action)('Configuration updated', req));
}
async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await (0, bcp_seed_1.seedBcpModule)(tenantId, schema);
    (0, middleware_port_1.setAuditData)(res, { action: 'reseed', entityType: 'bcp', entityId: tenantId });
    res.json((0, module_sdk_1.action)('Module reseeded', req));
}
async function getModuleHealth(req, res) {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const seedData = (0, bcp_seed_1.getBcpSeedData)();
    const [statusStats, testingStats] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'testing')::int AS testing,
         COUNT(*) FILTER (WHERE status = 'failed_test')::int AS failed_test,
         COUNT(*) FILTER (WHERE status = 'review')::int AS review,
         COUNT(*) FILTER (WHERE status = 'retired')::int AS retired
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE status = 'active' AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${bcp_constants_1.BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days'))::int AS overdue_testing,
         COUNT(*) FILTER (WHERE status = 'active' AND last_tested > NOW() - INTERVAL '${bcp_constants_1.BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')::int AS tested_recently,
         COUNT(*) FILTER (WHERE status = 'failed_test')::int AS failed_tests
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
    ]);
    const ss = statusStats.rows[0] || {};
    const ts = testingStats.rows[0] || {};
    let healthStatus = 'healthy';
    if ((ts.overdue_testing || 0) > 5 || (ts.failed_tests || 0) > 3)
        healthStatus = 'critical';
    else if ((ts.overdue_testing || 0) > 2 || (ts.failed_tests || 0) > 0)
        healthStatus = 'degraded';
    res.json((0, module_sdk_1.ok)({
        moduleCode: 'bcp',
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        permissions: seedData.permissions.length,
        roles: seedData.roles.length,
        actions: seedData.actions.length,
        counts: {
            total: ss.total || 0,
            draft: ss.draft || 0,
            approved: ss.approved || 0,
            active: ss.active || 0,
            testing: ss.testing || 0,
            failedTest: ss.failed_test || 0,
            review: ss.review || 0,
            retired: ss.retired || 0,
        },
        testingReadiness: {
            overdueForTesting: ts.overdue_testing || 0,
            testedRecently: ts.tested_recently || 0,
            failedTests: ts.failed_tests || 0,
        },
        limits: bcp_constants_1.BCP_LIMITS,
        timeouts: bcp_constants_1.BCP_TIMEOUTS,
    }, req));
}
async function getReadinessAnalytics(req, res) {
    const tenantId = req.tenantId;
    const [kpis, planTypeBreakdown, testingHistory] = await Promise.all([
        bcpQuery.getKpiMetrics(tenantId),
        bcpQuery.getPlanTypeBreakdown(tenantId),
        bcpQuery.getTestingOverdue(tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ kpis, planTypeBreakdown, testingHistory }, req));
}
async function getTestingOverdue(req, res) {
    const overdue = await bcpQuery.getTestingOverdue(req.tenantId);
    res.json((0, module_sdk_1.ok)({ plans: overdue, total: overdue.length }, req));
}
async function reindexModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'reindex', entityType: 'bcp', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Reindex initiated', req));
}
async function backfillModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'backfill', entityType: 'bcp', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Backfill initiated', req));
}
//# sourceMappingURL=bcp-admin.controller.js.map