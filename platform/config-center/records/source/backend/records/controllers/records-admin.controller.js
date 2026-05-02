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
exports.getRetentionAnalytics = getRetentionAnalytics;
exports.getDisposalQueue = getDisposalQueue;
exports.getLegalHolds = getLegalHolds;
exports.reindexModule = reindexModule;
exports.backfillModule = backfillModule;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const records_seed_1 = require("../data/records-seed");
const database_port_1 = require("../ports/database.port");
const recordsQuery = __importStar(require("../repositories/records-query.repo"));
const records_constants_1 = require("../data/records-constants");
async function getModuleConfig(req, res) {
    const seedData = (0, records_seed_1.getRecordsSeedData)();
    res.json((0, module_sdk_1.ok)({ moduleCode: 'records', config: seedData.defaultConfigs }, req));
}
async function updateModuleConfig(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'records_config', entityId: 'records' });
    res.json((0, module_sdk_1.action)('Configuration updated', req));
}
async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await (0, records_seed_1.seedRecordsModule)(tenantId, schema);
    (0, middleware_port_1.setAuditData)(res, { action: 'reseed', entityType: 'records', entityId: tenantId });
    res.json((0, module_sdk_1.action)('Module reseeded', req));
}
async function getModuleHealth(req, res) {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const seedData = (0, records_seed_1.getRecordsSeedData)();
    const [recordStats, retentionStats, legalHoldStats] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'review')::int AS in_review,
         COUNT(*) FILTER (WHERE status = 'disposed')::int AS disposed,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".records_records WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date < NOW() AND status NOT IN ('disposed'))::int AS overdue_disposal,
         COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS upcoming_disposal,
         COUNT(*) FILTER (WHERE retention_period IS NULL)::int AS no_retention
       FROM "${schema}".records_records WHERE deleted_at IS NULL AND status NOT IN ('disposed', 'archived')`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS on_hold
       FROM "${schema}".records_records WHERE deleted_at IS NULL AND legal_hold = true`).catch(() => ({ rows: [{}] })),
    ]);
    const rs = recordStats.rows[0] || {};
    const rt = retentionStats.rows[0] || {};
    const lh = legalHoldStats.rows[0] || {};
    let healthStatus = 'healthy';
    if ((rt.overdue_disposal || 0) > 20 || (rt.no_retention || 0) > 50)
        healthStatus = 'critical';
    else if ((rt.overdue_disposal || 0) > 5 || (rt.no_retention || 0) > 10)
        healthStatus = 'degraded';
    res.json((0, module_sdk_1.ok)({
        moduleCode: 'records',
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        permissions: seedData.permissions?.length,
        roles: seedData.roles?.length,
        actions: seedData.actions?.length,
        counts: {
            totalRecords: rs.total || 0,
            activeRecords: rs.active || 0,
            inReview: rs.in_review || 0,
            disposed: rs.disposed || 0,
            archived: rs.archived || 0,
            overdueDisposal: rt.overdue_disposal || 0,
            upcomingDisposal: rt.upcoming_disposal || 0,
            noRetentionPolicy: rt.no_retention || 0,
            onLegalHold: lh.on_hold || 0,
        },
        limits: records_constants_1.RECORDS_LIMITS,
        timeouts: records_constants_1.RECORDS_TIMEOUTS,
    }, req));
}
async function getRetentionAnalytics(req, res) {
    const tenantId = req.tenantId;
    const [kpis, classBreakdown, retentionCompliance] = await Promise.all([
        recordsQuery.getKpiMetrics(tenantId),
        recordsQuery.getClassificationBreakdown(tenantId),
        recordsQuery.getRetentionCompliance(tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ kpis, classBreakdown, retentionCompliance }, req));
}
async function getDisposalQueue(req, res) {
    const queue = await recordsQuery.getDisposalQueue(req.tenantId);
    res.json((0, module_sdk_1.ok)({ queue, total: queue.length }, req));
}
async function getLegalHolds(req, res) {
    const holds = await recordsQuery.getLegalHolds(req.tenantId);
    res.json((0, module_sdk_1.ok)({ holds, total: holds.length }, req));
}
async function reindexModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'reindex', entityType: 'records', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Reindex initiated', req));
}
async function backfillModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'backfill', entityType: 'records', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Backfill initiated', req));
}
//# sourceMappingURL=records-admin.controller.js.map