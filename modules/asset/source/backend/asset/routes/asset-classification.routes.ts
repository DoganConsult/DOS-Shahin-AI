import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, moduleStack, auditMiddleware, setAuditData, fieldRbacFilter, validate } from '../ports/middleware.port';
import { createClassificationBody, updateClassificationBody, createAssignBody } from '../schemas/asset.schemas';
import { listClassifications, getClassificationById, createClassification, updateClassification, classifyAsset, getClassificationDistribution } from '../services/asset-classification.service';
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// List all classification definitions
router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listClassifications(req.tenantId!);
  res.json({ data: rows });
}));

// Distribution stats
router.get('/distribution', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dist = await getClassificationDistribution(req.tenantId!);
  res.json({ data: dist });
}));

// Get single classification
router.get('/:id', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const row = await getClassificationById(req.tenantId!, req.params.id);
  if (!row) { res.status(404).json({ error: 'Classification not found' }); return; }
  res.json(row);
}));

// Create classification definition
router.post('/', authenticate, requirePermission('asset.record.manage'), validate({ body: createClassificationBody }), asyncHandler(async (req, res) => {
  const row = await createClassification(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'classification', entityId: row.classification_id, afterState: row });
  res.status(201).json(row);
}));

// Update classification definition
router.put('/:id', authenticate, requirePermission('asset.record.manage'), validate({ body: updateClassificationBody }), asyncHandler(async (req, res) => {
  const row = await updateClassification(req.tenantId!, req.params.id, req.body);
  if (!row) { res.status(404).json({ error: 'Classification not found' }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'classification', entityId: req.params.id, afterState: row });
  res.json(row);
}));

// Classify an asset (assign classification)
router.post('/assign', authenticate, requirePermission('asset.record.write'), validate({ body: createAssignBody }), asyncHandler(async (req, res) => {
  const { asset_id, classification_id } = req.body;
  const row = await classifyAsset(req.tenantId!, req.user!.userId!, asset_id, classification_id);
  if (!row) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json(row);
}));

export default router;

