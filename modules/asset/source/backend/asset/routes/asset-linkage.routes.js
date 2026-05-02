"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const asset_schemas_1 = require("../schemas/asset.schemas");
const asset_linkage_service_1 = require("../services/asset-linkage.service");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('asset'));
router.use((0, middleware_port_1.auditMiddleware)('asset'));
router.use((0, middleware_port_1.fieldRbacFilter)('asset'));
// All links for an asset
router.get('/:assetId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, asset_linkage_service_1.getAllLinksForAsset)(req.tenantId, req.params.assetId);
    res.json(result);
}));
// ── Vendor Links ──
router.get('/:assetId/vendors', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await (0, asset_linkage_service_1.getVendorLinks)(req.tenantId, req.params.assetId);
    res.json({ data: rows });
}));
router.post('/:assetId/vendors', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createVendorsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const link = await (0, asset_linkage_service_1.createVendorLink)(req.tenantId, req.user.userId, req.params.assetId, req.body.vendor_id, req.body.link_type, req.body.notes, req.body.contract_ref);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_vendor_link', entityId: link.link_id });
    res.status(201).json(link);
}));
router.delete('/vendors/:linkId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    await (0, asset_linkage_service_1.deleteVendorLink)(req.tenantId, req.params.linkId);
    res.json({ message: 'Vendor link deleted' });
}));
// ── Evidence Links ──
router.get('/:assetId/evidence', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await (0, asset_linkage_service_1.getEvidenceLinks)(req.tenantId, req.params.assetId);
    res.json({ data: rows });
}));
router.post('/:assetId/evidence', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createEvidenceBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const link = await (0, asset_linkage_service_1.createEvidenceLink)(req.tenantId, req.user.userId, req.params.assetId, req.body.evidence_task_id, req.body.link_type, req.body.notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'asset_evidence_link', entityId: link.link_id });
    res.status(201).json(link);
}));
router.delete('/evidence/:linkId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: genericPayloadSchema }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    await (0, asset_linkage_service_1.deleteEvidenceLink)(req.tenantId, req.params.linkId);
    res.json({ message: 'Evidence link deleted' });
}));
// ── Control Links ──
router.get('/:assetId/controls', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await (0, asset_linkage_service_1.getControlLinks)(req.tenantId, req.params.assetId);
    res.json({ data: rows });
}));
router.post('/:assetId/controls', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createControlsBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const link = await (0, asset_linkage_service_1.createControlLink)(req.tenantId, req.user.userId, req.params.assetId, req.body.control_id, req.body.link_purpose, req.body.asset_type);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'control_asset_link', entityId: link?.link_id });
    res.status(201).json(link);
}));
// ── Risk Links ──
router.get('/:assetId/risks', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const rows = await (0, asset_linkage_service_1.getRiskLinks)(req.tenantId, req.params.assetId);
    res.json({ data: rows });
}));
router.post('/:assetId/risks', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.write'), (0, middleware_port_1.validate)({ body: asset_schemas_1.createRisksBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const link = await (0, asset_linkage_service_1.createRiskLink)(req.tenantId, req.user.userId, req.params.assetId, req.body.risk_id, req.body.link_type, req.body.notes);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'risk_asset_link', entityId: link.link_id });
    res.status(201).json(link);
}));
exports.default = router;
//# sourceMappingURL=asset-linkage.routes.js.map