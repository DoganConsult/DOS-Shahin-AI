"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_criticality_service_1 = require("../services/asset-criticality.service");
const asset_schemas_1 = require("../schemas/asset.schemas");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// Get critical assets list
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const result = await (0, asset_criticality_service_1.getCriticalAssets)(req.tenantId, page, pageSize);
    res.json(result);
}));
// Compute criticality for single asset
router.get('/:assetId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, asset_criticality_service_1.computeCriticality)(req.tenantId, req.params.assetId);
    if (!result) {
        res.status(404).json({ error: 'Asset not found' });
        return;
    }
    res.json(result);
}));
// Bulk recalculate all assets
router.post('/recalculate', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createRecalculateBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const results = await (0, asset_criticality_service_1.bulkComputeCriticality)(req.tenantId);
    res.json({ recalculated: results.length, results });
}));
exports.default = router;
//# sourceMappingURL=asset-criticality.routes.js.map