"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const asset_schemas_1 = require("../schemas/asset.schemas");
const asset_ownership_service_1 = require("../services/asset-ownership.service");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// Ownership stats
router.get('/stats', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const stats = await (0, asset_ownership_service_1.getOwnershipStats)(req.tenantId);
    res.json(stats);
}));
// Unowned entities
router.get('/unowned', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const entityType = req.query.entity_type || 'asset';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const result = await (0, asset_ownership_service_1.getUnownedEntities)(req.tenantId, entityType, page, pageSize);
    res.json(result);
}));
// Get current owners
router.get('/:entityType/:entityId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const owners = await (0, asset_ownership_service_1.getOwners)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json({ data: owners });
}));
// Get ownership history
router.get('/:entityType/:entityId/history', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const history = await (0, asset_ownership_service_1.getOwnerHistory)(req.tenantId, req.params.entityType, req.params.entityId);
    res.json({ data: history });
}));
// Assign owner
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.assignOwnerBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, asset_ownership_service_1.assignOwner)(req.tenantId, req.user.userId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_owner', entityId: result.ownership_id, afterState: result });
    res.status(201).json(result);
}));
// Transfer owner
router.post('/transfer', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createTransferBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const { entity_type, entity_id, owner_type, new_owner_id, notes } = req.body;
    const result = await (0, asset_ownership_service_1.transferOwner)(req.tenantId, req.user.userId, entity_type, entity_id, owner_type, new_owner_id, notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'asset_owner', entityId: result.ownership_id, afterState: result });
    res.json(result);
}));
// Revoke owner
router.delete('/:ownershipId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, asset_ownership_service_1.revokeOwner)(req.tenantId, req.user.userId, req.params.ownershipId);
    if (!result) {
        res.status(404).json({ error: 'Ownership record not found' });
        return;
    }
    (0, middleware_port_1.setAuditData)(res, { action: 'delete', entityType: 'asset_owner', entityId: req.params.ownershipId });
    res.json({ message: 'Ownership revoked' });
}));
exports.default = router;
//# sourceMappingURL=asset-ownership.routes.js.map