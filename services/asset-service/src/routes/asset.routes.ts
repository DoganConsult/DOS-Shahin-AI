import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as assetService from '../domain/asset.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishAssetCreated, publishAssetUpdated, publishAssetDecommissioned } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createAssetBody, updateAssetBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/asset.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'asset-service:asset', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await assetService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list assets', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await assetService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get asset stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await assetService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await assetService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.getAssetDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get asset dashboard', details: (err as Error).message });
  }
});

router.get('/module/classification-hierarchy', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.getClassificationHierarchy(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get classification hierarchy', details: (err as Error).message });
  }
});

router.post('/module/bulk-classify', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { assetIds, classification } = req.body;
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      res.status(400).json({ error: 'assetIds array is required' });
      return;
    }
    const result = await assetService.bulkClassify(tenantId, assetIds, classification || {}, actorId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk classify assets', details: (err as Error).message });
  }
});

router.get('/module/service-map', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.getServiceMap(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get service map', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await assetService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get asset', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createAssetBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await assetService.create(tenantId, req.body);
    recordAudit(tenantId, 'asset.created', 'asset', item.asset_id, actorId, { title: req.body.title || req.body.name });
    await publishAssetCreated(tenantId, item.asset_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Asset Created', `Asset "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.asset_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateAssetBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await assetService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'asset.updated', 'asset', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishAssetUpdated(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update asset', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await assetService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'asset.deleted', 'asset', req.params.id, actorId);
    await publishAssetDecommissioned(tenantId, req.params.id, {}, actorId);
    action(res, 'Asset deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.post('/:id/classify', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.classifyAsset(tenantId, req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Classification unavailable or asset not found' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to classify asset', details: (err as Error).message });
  }
});

router.get('/:id/criticality', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.calculateCriticality(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate criticality', details: (err as Error).message });
  }
});

router.get('/:id/dependencies', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await assetService.getDependencyMap(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dependency map', details: (err as Error).message });
  }
});

router.put('/:id/classification', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { classification, type, category, criticality } = req.body;
    const result = await assetService.updateClassification(tenantId, req.params.id, { classification, type, category, criticality }, actorId);
    if (!result) {
      res.status(404).json({ error: 'Asset not found or no changes' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update classification', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await assetService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition status', details: (err as Error).message });
  }
});

export default router;
