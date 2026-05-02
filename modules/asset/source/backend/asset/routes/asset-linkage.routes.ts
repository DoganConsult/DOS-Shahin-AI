import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter } from '../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());

import { createVendorsBody, createEvidenceBody, createControlsBody, createRisksBody } from '../schemas/asset.schemas';
import {
  getAllLinksForAsset,
  getVendorLinks, createVendorLink, deleteVendorLink,
  getEvidenceLinks, createEvidenceLink, deleteEvidenceLink,
  getControlLinks, createControlLink,
  getRiskLinks, createRiskLink,
} from '../services/asset-linkage.service';

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// All links for an asset
router.get('/:assetId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getAllLinksForAsset(req.tenantId!, req.params.assetId);
  res.json(result);
}));

// ── Vendor Links ──
router.get('/:assetId/vendors', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getVendorLinks(req.tenantId!, req.params.assetId);
  res.json({ data: rows });
}));

router.post('/:assetId/vendors', authenticate, requirePermission('asset.record.write'), validate({ body: createVendorsBody }), asyncHandler(async (req, res) => {
  const link = await createVendorLink(req.tenantId!, req.user!.userId!, req.params.assetId, req.body.vendor_id, req.body.link_type, req.body.notes, req.body.contract_ref);
  setAuditData(res as any, { action: 'create', entityType: 'asset_vendor_link', entityId: link.link_id });
  res.status(201).json(link);
}));

router.delete('/vendors/:linkId', authenticate, requirePermission('asset.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  await deleteVendorLink(req.tenantId!, req.params.linkId);
  res.json({ message: 'Vendor link deleted' });
}));

// ── Evidence Links ──
router.get('/:assetId/evidence', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getEvidenceLinks(req.tenantId!, req.params.assetId);
  res.json({ data: rows });
}));

router.post('/:assetId/evidence', authenticate, requirePermission('asset.record.write'), validate({ body: createEvidenceBody }), asyncHandler(async (req, res) => {
  const link = await createEvidenceLink(req.tenantId!, req.user!.userId!, req.params.assetId, req.body.evidence_task_id, req.body.link_type, req.body.notes);
  setAuditData(res as any, { action: 'create', entityType: 'asset_evidence_link', entityId: link.link_id });
  res.status(201).json(link);
}));

router.delete('/evidence/:linkId', authenticate, requirePermission('asset.record.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  await deleteEvidenceLink(req.tenantId!, req.params.linkId);
  res.json({ message: 'Evidence link deleted' });
}));

// ── Control Links ──
router.get('/:assetId/controls', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getControlLinks(req.tenantId!, req.params.assetId);
  res.json({ data: rows });
}));

router.post('/:assetId/controls', authenticate, requirePermission('asset.record.write'), validate({ body: createControlsBody }), asyncHandler(async (req, res) => {
  const link = await createControlLink(req.tenantId!, req.user!.userId!, req.params.assetId, req.body.control_id, req.body.link_purpose, req.body.asset_type);
  setAuditData(res as any, { action: 'create', entityType: 'control_asset_link', entityId: link?.link_id });
  res.status(201).json(link);
}));

// ── Risk Links ──
router.get('/:assetId/risks', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getRiskLinks(req.tenantId!, req.params.assetId);
  res.json({ data: rows });
}));

router.post('/:assetId/risks', authenticate, requirePermission('asset.record.write'), validate({ body: createRisksBody }), asyncHandler(async (req, res) => {
  const link = await createRiskLink(req.tenantId!, req.user!.userId!, req.params.assetId, req.body.risk_id, req.body.link_type, req.body.notes);
  setAuditData(res as any, { action: 'create', entityType: 'risk_asset_link', entityId: link.link_id });
  res.status(201).json(link);
}));

export default router;

