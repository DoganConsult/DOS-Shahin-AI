"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_classification_service_1 = require("../services/asset-classification.service");
const asset_lifecycle_service_1 = require("../services/asset-lifecycle.service");
const asset_criticality_service_1 = require("../services/asset-criticality.service");
const asset_schemas_1 = require("../schemas/asset.schemas");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// Module configuration overview
router.get('/config', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const [classifications, stages] = await Promise.all([
        (0, asset_classification_service_1.listClassifications)(req.tenantId),
        (0, asset_lifecycle_service_1.getLifecycleStages)(),
    ]);
    res.json({ classifications, lifecycleStages: stages });
}));
// Manage classification definitions
router.post('/classifications', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createClassificationsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await (0, asset_classification_service_1.createClassification)(req.tenantId, req.body);
    res.status(201).json(row);
}));
router.put('/classifications/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.updateClassificationsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await (0, asset_classification_service_1.updateClassification)(req.tenantId, req.params.id, req.body);
    if (!row) {
        res.status(404).json({ error: 'Classification not found' });
        return;
    }
    res.json(row);
}));
// Trigger bulk criticality recalculation
router.post('/recalculate-criticality', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createRecalculateCriticalityBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const results = await (0, asset_criticality_service_1.bulkComputeCriticality)(req.tenantId);
    res.json({ recalculated: results.length });
}));
exports.default = router;
//# sourceMappingURL=asset-admin.routes.js.map