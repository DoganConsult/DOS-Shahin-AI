"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_schemas_1 = require("../schemas/asset.schemas");
const common_schemas_1 = require("../../../schemas/common.schemas");
const application_registry_service_1 = require("../services/application-registry.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: asset_schemas_1.listApplicationsQuery }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, application_registry_service_1.listApplications)(req.tenantId, req.query);
    res.json(result);
}));
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, application_registry_service_1.getApplicationStats)(req.tenantId);
    res.json(stats);
}));
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const app = await (0, application_registry_service_1.getApplicationById)(req.tenantId, req.params.id);
    if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
    }
    res.json(app);
}));
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createApplicationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const app = await (0, application_registry_service_1.createApplication)(req.tenantId, req.user.userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'application', entityId: app.application_id, afterState: app });
    res.status(201).json(app);
}));
router.put('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: asset_schemas_1.updateApplicationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const app = await (0, application_registry_service_1.updateApplication)(req.tenantId, req.user.userId, req.params.id, req.body);
    if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'application', entityId: req.params.id, afterState: app });
    res.json(app);
}));
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const app = await (0, application_registry_service_1.deleteApplication)(req.tenantId, req.user.userId, req.params.id);
    if (!app) {
        res.status(404).json({ error: 'Application not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'application', entityId: req.params.id });
    res.json({ message: 'Application deleted' });
}));
exports.default = router;
//# sourceMappingURL=asset-applications.routes.js.map