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
exports.getOverdueAnalytics = getOverdueAnalytics;
exports.getAssigneeWorkload = getAssigneeWorkload;
exports.reindexModule = reindexModule;
exports.backfillModule = backfillModule;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const action_seed_1 = require("../data/action-seed");
const database_port_1 = require("../ports/database.port");
const actionQuery = __importStar(require("../repositories/action-query.repo"));
const action_constants_1 = require("../data/action-constants");
async function getModuleConfig(req, res) {
    const seedData = (0, action_seed_1.getActionSeedData)();
    res.json((0, module_sdk_1.ok)({ moduleCode: 'action', config: seedData.defaultConfigs }, req));
}
async function updateModuleConfig(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'action_config', entityId: 'action' });
    res.json((0, module_sdk_1.action)('Configuration updated', req));
}
async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await (0, action_seed_1.seedActionModule)(tenantId, schema);
    (0, middleware_port_1.setAuditData)(res, { action: 'reseed', entityType: 'action', entityId: tenantId });
    res.json((0, module_sdk_1.action)('Module reseeded', req));
}
async function getModuleHealth(req, res) {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const seedData = (0, action_seed_1.getActionSeedData)();
    const [statusStats, overdueStats] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_status
       FROM "${schema}".action_action_items WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue,
         COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours' AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS due_soon,
         COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS critical_open
       FROM "${schema}".action_action_items WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
    ]);
    const ss = statusStats.rows[0] || {};
    const os = overdueStats.rows[0] || {};
    let healthStatus = 'healthy';
    if ((os.overdue || 0) > 10 || (os.critical_open || 0) > 5)
        healthStatus = 'critical';
    else if ((os.overdue || 0) > 3 || (os.due_soon || 0) > 5)
        healthStatus = 'degraded';
    res.json((0, module_sdk_1.ok)({
        moduleCode: 'action',
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        permissions: seedData.permissions?.length ?? 0,
        roles: seedData.roles?.length ?? 0,
        actions: seedData.actions?.length ?? 0,
        counts: {
            total: ss.total || 0,
            open: ss.open_count || 0,
            inProgress: ss.in_progress || 0,
            pendingReview: ss.pending_review || 0,
            completed: ss.completed || 0,
        },
        urgency: {
            overdue: os.overdue || 0,
            dueSoon: os.due_soon || 0,
            criticalOpen: os.critical_open || 0,
        },
        limits: action_constants_1.ACTION_LIMITS,
        timeouts: action_constants_1.ACTION_TIMEOUTS,
    }, req));
}
async function getOverdueAnalytics(req, res) {
    const tenantId = req.tenantId;
    const [kpis, sourceBreakdown, priorityBreakdown] = await Promise.all([
        actionQuery.getKpiMetrics(tenantId),
        actionQuery.getSourceBreakdown(tenantId),
        actionQuery.getPriorityBreakdown(tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ kpis, sourceBreakdown, priorityBreakdown }, req));
}
async function getAssigneeWorkload(req, res) {
    const workload = await actionQuery.getAssigneeWorkload(req.tenantId);
    res.json((0, module_sdk_1.ok)({ workload, total: workload.length }, req));
}
async function reindexModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'reindex', entityType: 'action', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Reindex initiated', req));
}
async function backfillModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'backfill', entityType: 'action', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Backfill initiated', req));
}
//# sourceMappingURL=action-admin.controller.js.map