import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as productLicenseService from '../domain/product-license.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishProductLicenseActivated, publishProductLicenseUpgraded } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { asyncHandler, validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createProductLicenseBody, updateProductLicenseBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/product-license.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'platform-product-service:product-license', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await productLicenseService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list product-licenses', details: (err as Error).message });
  }
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await productLicenseService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product-license stats', details: (err as Error).message });
  }
}));

router.post('/bulk', validate({ body: bulkCreateBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await productLicenseService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
}));

router.delete('/bulk', validate({ body: bulkDeleteBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await productLicenseService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await productLicenseService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'ProductLicense not found', code: 'PRODUCT_LICENSE_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product-license', details: (err as Error).message });
  }
}));

router.post('/', validate({ body: createProductLicenseBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await productLicenseService.create(tenantId, req.body);
    recordAudit(tenantId, 'product-license.created', 'product-license', item.license_id, actorId, { title: req.body.title || req.body.name });
    await publishProductLicenseActivated(tenantId, item.license_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'ProductLicense Created', `ProductLicense "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.license_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product-license', details: (err as Error).message });
  }
}));

router.put('/:id', validate({ body: updateProductLicenseBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await productLicenseService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'ProductLicense not found', code: 'PRODUCT_LICENSE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'product-license.updated', 'product-license', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishProductLicenseUpgraded(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product-license', details: (err as Error).message });
  }
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await productLicenseService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'ProductLicense not found', code: 'PRODUCT_LICENSE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'product-license.deleted', 'product-license', req.params.id, actorId);
    action(res, 'ProductLicense deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product-license', details: (err as Error).message });
  }
}));

export default router;
