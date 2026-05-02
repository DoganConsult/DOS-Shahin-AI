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
exports.getAssetInventoryAnalytics = getAssetInventoryAnalytics;
exports.getUnclassifiedAssets = getUnclassifiedAssets;
exports.reindexModule = reindexModule;
exports.backfillModule = backfillModule;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
const asset_seed_1 = require("../data/asset-seed");
const database_port_1 = require("../ports/database.port");
const assetQuery = __importStar(require("../repositories/asset-query.repo"));
const asset_constants_1 = require("../data/asset-constants");
async function getModuleConfig(req, res) {
    const seedData = (0, asset_seed_1.getAssetSeedData)();
    res.json((0, module_sdk_1.ok)({ moduleCode: 'asset', config: seedData.defaultConfigs }, req));
}
async function updateModuleConfig(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'asset_config', entityId: 'asset' });
    res.json((0, module_sdk_1.action)('Configuration updated', req));
}
async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await (0, asset_seed_1.seedAssetModule)(tenantId, schema);
    (0, middleware_port_1.setAuditData)(res, { action: 'reseed', entityType: 'asset', entityId: tenantId });
    res.json((0, module_sdk_1.action)('Module reseeded', req));
}
async function getModuleHealth(req, res) {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const seedData = (0, asset_seed_1.getAssetSeedData)();
    const [statusStats, classStats] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'discovered')::int AS discovered,
         COUNT(*) FILTER (WHERE status = 'registered')::int AS registered,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
         COUNT(*) FILTER (WHERE status = 'decommissioning')::int AS decommissioning,
         COUNT(*) FILTER (WHERE status = 'disposed')::int AS disposed
       FROM "${schema}".asset_assets WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT
         COUNT(*) FILTER (WHERE classification IS NULL OR classification = '')::int AS unclassified,
         COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical_assets,
         COUNT(*) FILTER (WHERE owner_id IS NULL)::int AS unowned,
         COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${asset_constants_1.ASSET_TIMEOUTS.REVIEW_CYCLE_DAYS} days' AND status = 'active')::int AS overdue_review
       FROM "${schema}".asset_assets WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
    ]);
    const ss = statusStats.rows[0] || {};
    const cs = classStats.rows[0] || {};
    let healthStatus = 'healthy';
    if ((cs.unclassified || 0) > 20 || (cs.unowned || 0) > 10)
        healthStatus = 'critical';
    else if ((cs.unclassified || 0) > 5 || (cs.overdue_review || 0) > 10)
        healthStatus = 'degraded';
    res.json((0, module_sdk_1.ok)({
        moduleCode: 'asset',
        status: healthStatus,
        lastCheck: new Date().toISOString(),
        permissions: seedData.permissions?.length,
        roles: seedData.roles?.length,
        actions: seedData.actions?.length,
        counts: {
            total: ss.total || 0,
            discovered: ss.discovered || 0,
            registered: ss.registered || 0,
            active: ss.active || 0,
            maintenance: ss.maintenance || 0,
            decommissioning: ss.decommissioning || 0,
            disposed: ss.disposed || 0,
        },
        classification: {
            unclassified: cs.unclassified || 0,
            criticalAssets: cs.critical_assets || 0,
            unowned: cs.unowned || 0,
            overdueReview: cs.overdue_review || 0,
        },
        limits: asset_constants_1.ASSET_LIMITS,
        timeouts: asset_constants_1.ASSET_TIMEOUTS,
    }, req));
}
async function getAssetInventoryAnalytics(req, res) {
    const tenantId = req.tenantId;
    const [kpis, typeBreakdown, classBreakdown] = await Promise.all([
        assetQuery.getKpiMetrics(tenantId),
        assetQuery.getTypeBreakdown(tenantId),
        assetQuery.getClassificationBreakdown(tenantId),
    ]);
    res.json((0, module_sdk_1.ok)({ kpis, typeBreakdown, classBreakdown }, req));
}
async function getUnclassifiedAssets(req, res) {
    const unclassified = await assetQuery.getUnclassifiedAssets(req.tenantId);
    res.json((0, module_sdk_1.ok)({ assets: unclassified, total: unclassified.length }, req));
}
async function reindexModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'reindex', entityType: 'asset', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Reindex initiated', req));
}
async function backfillModule(req, res) {
    (0, middleware_port_1.setAuditData)(res, { action: 'backfill', entityType: 'asset', entityId: req.tenantId });
    res.json((0, module_sdk_1.action)('Backfill initiated', req));
}
//# sourceMappingURL=asset-admin.controller.js.map