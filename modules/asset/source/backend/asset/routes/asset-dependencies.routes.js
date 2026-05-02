"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_schemas_1 = require("../schemas/asset.schemas");
const dependency_service_1 = require("../services/dependency.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const q = req.query;
    const result = await (0, dependency_service_1.listDependencies)(req.tenantId, {
        source_type: q.source_type, source_id: q.source_id,
        target_type: q.target_type, target_id: q.target_id,
        dependency_type: q.dependency_type,
        page: q.page ? parseInt(q.page) : undefined,
        pageSize: q.pageSize ? parseInt(q.pageSize) : undefined,
    });
    res.json(result);
}));
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, dependency_service_1.getDependencyStats)(req.tenantId);
    res.json(stats);
}));
router.get('/upstream/:entityType/:entityId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const chain = await (0, dependency_service_1.getUpstreamChain)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json({ data: chain });
}));
router.get('/downstream/:entityType/:entityId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const chain = await (0, dependency_service_1.getDownstreamChain)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json({ data: chain });
}));
router.get('/blast-radius/:entityType/:entityId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, dependency_service_1.getBlastRadius)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json(result);
}));
router.get('/cycles', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const cycles = await (0, dependency_service_1.detectCycles)(req.tenantId);
    res.json({ cycles, hasCycles: cycles.length > 0 });
}));
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createDependencyBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dep = await (0, dependency_service_1.createDependency)(req.tenantId, req.user.userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'dependency', entityId: dep.dependency_id, afterState: dep });
    res.status(201).json(dep);
}));
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const dep = await (0, dependency_service_1.deleteDependency)(req.tenantId, req.user.userId, req.params.id);
    if (!dep) {
        res.status(404).json({ error: 'Dependency not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'dependency', entityId: req.params.id });
    res.json({ message: 'Dependency deleted' });
}));
exports.default = router;
//# sourceMappingURL=asset-dependencies.routes.js.map