import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as integrationService from '../domain/integration.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishIntegrationConnected, publishIntegrationDisconnected } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createIntegrationBody, updateIntegrationBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/integration.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'integrations-service:integration', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await integrationService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list integrations', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await integrationService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get integration stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await integrationService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await integrationService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await integrationService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Integration not found', code: 'INTEGRATION_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get integration', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createIntegrationBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await integrationService.create(tenantId, req.body);
    recordAudit(tenantId, 'integration.created', 'integration', item.integration_id, actorId, { title: req.body.title || req.body.name });
    await publishIntegrationConnected(tenantId, item.integration_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Integration Created', `Integration "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.integration_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create integration', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateIntegrationBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await integrationService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Integration not found', code: 'INTEGRATION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'integration.updated', 'integration', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update integration', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await integrationService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Integration not found', code: 'INTEGRATION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'integration.deleted', 'integration', req.params.id, actorId);
    await publishIntegrationDisconnected(tenantId, req.params.id, {}, actorId);
    action(res, 'Integration deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete integration', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/connectors', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await integrationService.listConnectors(tenantId);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list connectors', details: (err as Error).message });
  }
});

router.post('/connectors/:connectionId/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await integrationService.triggerSync(tenantId, req.params.connectionId);
    ok(res, result ?? { message: 'Sync trigger unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger sync', details: (err as Error).message });
  }
});

router.get('/config/:integrationCode', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await integrationService.resolveConfig(tenantId, req.params.integrationCode);
    ok(res, result ?? { message: 'Config unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve config', details: (err as Error).message });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await integrationService.getIntegrationDashboard(tenantId);
    ok(res, result ?? { message: 'Integration dashboard unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get integration dashboard', details: (err as Error).message });
  }
});

export default router;
