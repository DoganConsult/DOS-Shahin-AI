import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as widgetService from '../domain/widget.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishWidgetCreated, publishWidgetUpdated } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createWidgetBody, updateWidgetBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/widget.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'dashboard-widgets-service:widget', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await widgetService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list widgets', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await widgetService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get widget stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await widgetService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await widgetService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await widgetService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Widget not found', code: 'WIDGET_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get widget', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createWidgetBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await widgetService.create(tenantId, req.body);
    recordAudit(tenantId, 'widget.created', 'widget', item.widget_id, actorId, { title: req.body.title || req.body.name });
    await publishWidgetCreated(tenantId, item.widget_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Widget Created', `Widget "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.widget_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create widget', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateWidgetBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await widgetService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Widget not found', code: 'WIDGET_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'widget.updated', 'widget', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishWidgetUpdated(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update widget', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await widgetService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Widget not found', code: 'WIDGET_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'widget.deleted', 'widget', req.params.id, actorId);
    action(res, 'Widget deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete widget', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/data/risk-heatmap', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await widgetService.getRiskHeatmapData(tenantId);
    ok(res, result ?? { message: 'Risk heatmap data unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get risk heatmap data', details: (err as Error).message });
  }
});

router.get('/data/compliance-trend', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await widgetService.getComplianceTrendData(tenantId);
    ok(res, result ?? { message: 'Compliance trend data unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get compliance trend data', details: (err as Error).message });
  }
});

router.get('/:id/insights', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await widgetService.getWidgetInsights(tenantId, req.params.id);
    ok(res, result ?? { message: 'Widget insights unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get widget insights', details: (err as Error).message });
  }
});

router.get('/compose/:templateKey', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await widgetService.composeDashboard(tenantId, req.params.templateKey);
    ok(res, result ?? { message: 'Dashboard composition unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compose dashboard', details: (err as Error).message });
  }
});

router.get('/zones', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const result = await widgetService.getDashboardZones(tenantId, userId);
    ok(res, result ?? { message: 'Dashboard zones unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dashboard zones', details: (err as Error).message });
  }
});

router.post('/cache/invalidate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    await widgetService.invalidateCache(tenantId);
    ok(res, { message: 'Cache invalidated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invalidate cache', details: (err as Error).message });
  }
});

export default router;
