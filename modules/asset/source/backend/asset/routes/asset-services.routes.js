"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_schemas_1 = require("../schemas/asset.schemas");
const common_schemas_1 = require("../../../schemas/common.schemas");
const business_service_service_1 = require("../services/business-service.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: asset_schemas_1.listBusinessServicesQuery }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, business_service_service_1.listBusinessServices)(req.tenantId, req.query);
    res.json(result);
}));
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, business_service_service_1.getServiceStats)(req.tenantId);
    res.json(stats);
}));
router.get('/hierarchy', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rootId = req.query.rootId;
    const tree = await (0, business_service_service_1.getServiceHierarchy)(req.tenantId, rootId);
    res.json({ data: tree });
}));
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const svc = await (0, business_service_service_1.getBusinessServiceById)(req.tenantId, req.params.id);
    if (!svc) {
        res.status(404).json({ error: 'Business service not found' });
        return;
    }
    res.json(svc);
}));
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createBusinessServiceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const svc = await (0, business_service_service_1.createBusinessService)(req.tenantId, req.user.userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'business_service', entityId: svc.service_id, afterState: svc });
    res.status(201).json(svc);
}));
router.put('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: asset_schemas_1.updateBusinessServiceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const svc = await (0, business_service_service_1.updateBusinessService)(req.tenantId, req.user.userId, req.params.id, req.body);
    if (!svc) {
        res.status(404).json({ error: 'Business service not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'business_service', entityId: req.params.id, afterState: svc });
    res.json(svc);
}));
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const svc = await (0, business_service_service_1.deleteBusinessService)(req.tenantId, req.user.userId, req.params.id);
    if (!svc) {
        res.status(404).json({ error: 'Business service not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'business_service', entityId: req.params.id });
    res.json({ message: 'Business service deleted' });
}));
exports.default = router;
//# sourceMappingURL=asset-services.routes.js.map