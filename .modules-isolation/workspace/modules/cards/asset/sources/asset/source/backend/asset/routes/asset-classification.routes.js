"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_schemas_1 = require("../schemas/asset.schemas");
const asset_classification_service_1 = require("../services/asset-classification.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// List all classification definitions
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await (0, asset_classification_service_1.listClassifications)(req.tenantId);
    res.json({ data: rows });
}));
// Distribution stats
router.get('/distribution', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dist = await (0, asset_classification_service_1.getClassificationDistribution)(req.tenantId);
    res.json({ data: dist });
}));
// Get single classification
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await (0, asset_classification_service_1.getClassificationById)(req.tenantId, req.params.id);
    if (!row) {
        res.status(404).json({ error: 'Classification not found' });
        return;
    }
    res.json(row);
}));
// Create classification definition
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createClassificationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await (0, asset_classification_service_1.createClassification)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'classification', entityId: row.classification_id, afterState: row });
    res.status(201).json(row);
}));
// Update classification definition
router.put('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.manage'), (0, middleware_port_1.validate)({ body: asset_schemas_1.updateClassificationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const row = await (0, asset_classification_service_1.updateClassification)(req.tenantId, req.params.id, req.body);
    if (!row) {
        res.status(404).json({ error: 'Classification not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'classification', entityId: req.params.id, afterState: row });
    res.json(row);
}));
// Classify an asset (assign classification)
router.post('/assign', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createAssignBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { asset_id, classification_id } = req.body;
    const row = await (0, asset_classification_service_1.classifyAsset)(req.tenantId, req.user.userId, asset_id, classification_id);
    if (!row) {
        res.status(404).json({ error: 'Asset not found' });
        return;
    }
    res.json(row);
}));
exports.default = router;
//# sourceMappingURL=asset-classification.routes.js.map