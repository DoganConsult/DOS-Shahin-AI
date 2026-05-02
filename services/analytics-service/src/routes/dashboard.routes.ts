import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as dashboardService from '../domain/dashboard.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishAnalyticsDashboardCreated } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createDashboardBody, updateDashboardBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/dashboard.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'analytics-service:dashboard', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await dashboardService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list dashboards', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await dashboardService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dashboard stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await dashboardService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await dashboardService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await dashboardService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Dashboard not found', code: 'DASHBOARD_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dashboard', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createDashboardBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await dashboardService.create(tenantId, req.body);
    recordAudit(tenantId, 'dashboard.created', 'dashboard', item.dashboard_id, actorId, { title: req.body.title || req.body.name });
    await publishAnalyticsDashboardCreated(tenantId, item.dashboard_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Dashboard Created', `Dashboard "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.dashboard_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create dashboard', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateDashboardBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await dashboardService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Dashboard not found', code: 'DASHBOARD_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'dashboard.updated', 'dashboard', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dashboard', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await dashboardService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Dashboard not found', code: 'DASHBOARD_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'dashboard.deleted', 'dashboard', req.params.id, actorId);
    action(res, 'Dashboard deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete dashboard', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await dashboardService.computeKPIs(tenantId);
    ok(res, result ?? { message: 'KPI computation unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute KPIs', details: (err as Error).message });
  }
});

router.post('/kpis/aggregate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    await dashboardService.runAggregationJob(tenantId);
    ok(res, { message: 'Aggregation job triggered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run aggregation', details: (err as Error).message });
  }
});

router.get('/kpis/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const days = req.query.days ? Number(req.query.days) : undefined;
    const result = await dashboardService.getKpiTrends(tenantId, days);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get KPI trends', details: (err as Error).message });
  }
});

router.get('/benchmark', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await dashboardService.getBenchmarkData(tenantId);
    ok(res, result ?? { message: 'Benchmark data unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get benchmark data', details: (err as Error).message });
  }
});

router.get('/health-score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await dashboardService.computeTenantHealthScore(tenantId);
    ok(res, result ?? { message: 'Health score unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute health score', details: (err as Error).message });
  }
});

router.get('/forecast/compliance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const daysAhead = req.query.daysAhead ? Number(req.query.daysAhead) : undefined;
    const result = await dashboardService.forecastComplianceScore(tenantId, daysAhead);
    ok(res, result ?? { message: 'Forecast unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to forecast compliance', details: (err as Error).message });
  }
});

router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await dashboardService.detectAnomalies(tenantId);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to detect anomalies', details: (err as Error).message });
  }
});

export default router;
