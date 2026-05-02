import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack, fieldRbacFilter } from '../ports/middleware.port';
import { computeCriticality, bulkComputeCriticality, getCriticalAssets } from '../services/asset-criticality.service';
import { createRecalculateBody } from '../schemas/asset.schemas';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// Get critical assets list
router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 25;
  const result = await getCriticalAssets(req.tenantId!, page, pageSize);
  res.json(result);
}));

// Compute criticality for single asset
router.get('/:assetId', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await computeCriticality(req.tenantId!, req.params.assetId);
  if (!result) { res.status(404).json({ error: 'Asset not found' }); return; }
  res.json(result);
}));

// Bulk recalculate all assets
router.post('/recalculate', authenticate, requirePermission('asset.record.manage'), validate({ body: createRecalculateBody }), asyncHandler(async (req, res) => {
  const results = await bulkComputeCriticality(req.tenantId!);
  res.json({ recalculated: results.length, results });
}));

export default router;

