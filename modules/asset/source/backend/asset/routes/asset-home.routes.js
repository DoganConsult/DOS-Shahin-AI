"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_reports_service_1 = require("../services/asset-reports.service");
const asset_registry_service_1 = require("../services/asset-registry.service");
const asset_lifecycle_service_1 = require("../services/asset-lifecycle.service");
const asset_classification_service_1 = require("../services/asset-classification.service");
const dependency_service_1 = require("../services/dependency.service");
const asset_ownership_service_1 = require("../services/asset-ownership.service");
const asset_criticality_service_1 = require("../services/asset-criticality.service");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// Full dashboard summary
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const summary = await (0, asset_reports_service_1.getDashboardSummary)(req.tenantId);
    res.json(summary);
}));
// KPIs endpoint — aggregated data matching frontend AssetHomeKpis contract
router.get('/kpis', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const [summary, lifecycle, classification, criticalData, _unowned] = await Promise.all([
        (0, asset_reports_service_1.getDashboardSummary)(req.tenantId),
        (0, asset_lifecycle_service_1.getLifecycleDistribution)(req.tenantId),
        (0, asset_classification_service_1.getClassificationDistribution)(req.tenantId),
        (0, asset_criticality_service_1.getCriticalAssets)(req.tenantId),
        (0, asset_ownership_service_1.getUnownedEntities)(req.tenantId, 'asset'),
    ]);
    const criticalityBreakdown = {};
    for (const a of (criticalData?.data ?? [])) {
        const c = a.criticality || 'unknown';
        criticalityBreakdown[c] = (criticalityBreakdown[c] || 0) + 1;
    }
    const classificationDistribution = {};
    for (const row of (classification ?? [])) {
        const r = row;
        classificationDistribution[r.classification || 'unclassified'] = r.count || 0;
    }
    const lifecycleDistribution = {};
    for (const row of (lifecycle ?? [])) {
        const r = row;
        lifecycleDistribution[r.stage || 'unknown'] = r.count || 0;
    }
    res.json({
        totalAssets: summary?.total_assets ?? 0,
        totalApplications: summary?.total_applications ?? 0,
        totalServices: summary?.total_services ?? 0,
        criticalAssets: summary?.critical_assets ?? 0,
        unownedAssets: Math.max(0, (summary?.total_assets || 0) - (summary?.owned_assets || 0)),
        criticalityBreakdown,
        classificationDistribution,
        lifecycleDistribution,
    });
}));
// Asset health stats
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, asset_registry_service_1.getAssetStats)(req.tenantId);
    res.json(stats);
}));
// Lifecycle distribution
router.get('/lifecycle', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dist = await (0, asset_lifecycle_service_1.getLifecycleDistribution)(req.tenantId);
    res.json({ distribution: dist });
}));
// Classification distribution
router.get('/classification', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dist = await (0, asset_classification_service_1.getClassificationDistribution)(req.tenantId);
    res.json({ distribution: dist });
}));
// Dependency stats
router.get('/dependencies', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, dependency_service_1.getDependencyStats)(req.tenantId);
    res.json(stats);
}));
// Ownership stats
router.get('/ownership', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, asset_ownership_service_1.getOwnershipStats)(req.tenantId);
    res.json(stats);
}));
exports.default = router;
//# sourceMappingURL=asset-home.routes.js.map