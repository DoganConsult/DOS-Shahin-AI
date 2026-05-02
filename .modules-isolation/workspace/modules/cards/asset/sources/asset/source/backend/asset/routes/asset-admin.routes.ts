import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack, fieldRbacFilter } from '../ports/middleware.port';
import { listClassifications, createClassification, updateClassification } from '../services/asset-classification.service';
import { getLifecycleStages } from '../services/asset-lifecycle.service';
import { bulkComputeCriticality } from '../services/asset-criticality.service';
import { createClassificationsBody, updateClassificationsBody, createRecalculateCriticalityBody } from '../schemas/asset.schemas';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// Module configuration overview
router.get('/config', authenticate, requirePermission('asset.record.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const [classifications, stages] = await Promise.all([
    listClassifications(req.tenantId!),
    getLifecycleStages(),
  ]);
  res.json({ classifications, lifecycleStages: stages });
}));

// Manage classification definitions
router.post('/classifications', authenticate, requirePermission('asset.record.manage'), validate({ body: createClassificationsBody }), asyncHandler(async (req, res) => {
  const row = await createClassification(req.tenantId!, req.body);
  res.status(201).json(row);
}));

router.put('/classifications/:id', authenticate, requirePermission('asset.record.manage'), validate({ body: updateClassificationsBody }), asyncHandler(async (req, res) => {
  const row = await updateClassification(req.tenantId!, req.params.id, req.body);
  if (!row) { res.status(404).json({ error: 'Classification not found' }); return; }
  res.json(row);
}));

// Trigger bulk criticality recalculation
router.post('/recalculate-criticality', authenticate, requirePermission('asset.record.manage'), validate({ body: createRecalculateCriticalityBody }), asyncHandler(async (req, res) => {
  const results = await bulkComputeCriticality(req.tenantId!);
  res.json({ recalculated: results.length });
}));

export default router;

