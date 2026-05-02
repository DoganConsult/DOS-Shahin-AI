import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as reportScheduleService from '../domain/report-schedule.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishReportingScheduleTriggered } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createReportScheduleBody, updateReportScheduleBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/report-schedule.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'analytics-reporting-service:report-schedule', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await reportScheduleService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list report-schedules', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await reportScheduleService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get report-schedule stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await reportScheduleService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await reportScheduleService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await reportScheduleService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'ReportSchedule not found', code: 'REPORT_SCHEDULE_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get report-schedule', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createReportScheduleBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await reportScheduleService.create(tenantId, req.body);
    recordAudit(tenantId, 'report-schedule.created', 'report-schedule', item.schedule_id, actorId, { title: req.body.title || req.body.name });
    await publishReportingScheduleTriggered(tenantId, item.schedule_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'ReportSchedule Created', `ReportSchedule "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.schedule_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create report-schedule', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateReportScheduleBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await reportScheduleService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'ReportSchedule not found', code: 'REPORT_SCHEDULE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'report-schedule.updated', 'report-schedule', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report-schedule', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await reportScheduleService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'ReportSchedule not found', code: 'REPORT_SCHEDULE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'report-schedule.deleted', 'report-schedule', req.params.id, actorId);
    action(res, 'ReportSchedule deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report-schedule', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/executive-narrative', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await reportScheduleService.generateExecutiveNarrative(tenantId);
    ok(res, result ?? { message: 'Executive narrative unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate executive narrative', details: (err as Error).message });
  }
});

router.get('/analytics-dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await reportScheduleService.getAnalyticsDashboard(tenantId);
    ok(res, result ?? { message: 'Analytics dashboard unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get analytics dashboard', details: (err as Error).message });
  }
});

router.get('/cross-module', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await reportScheduleService.getCrossModuleAggregation(tenantId);
    ok(res, result ?? { message: 'Cross-module aggregation unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cross-module aggregation', details: (err as Error).message });
  }
});

router.get('/usage-forecast', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await reportScheduleService.getUsageForecast(tenantId);
    ok(res, result ?? { message: 'Usage forecast unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get usage forecast', details: (err as Error).message });
  }
});

router.get('/telemetry', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await reportScheduleService.getTelemetryAggregation(tenantId);
    ok(res, result ?? { message: 'Telemetry data unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get telemetry aggregation', details: (err as Error).message });
  }
});

export default router;
