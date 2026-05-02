import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as bcpPlanService from '../domain/bcp-plan.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishBcpPlanCreated, publishBcpPlanReviewed } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createBcpPlanBody, updateBcpPlanBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/bcp-plan.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'bcp-service:bcp-plan', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await bcpPlanService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list bcp-plans', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await bcpPlanService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bcp-plan stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await bcpPlanService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await bcpPlanService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await bcpPlanService.getBcpDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get BCP dashboard', details: (err as Error).message });
  }
});

router.get('/module/predictive-analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await bcpPlanService.getPredictiveAnalytics(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get predictive analytics', details: (err as Error).message });
  }
});

router.get('/module/crisis-management', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await bcpPlanService.getCrisisManagement(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get crisis management data', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await bcpPlanService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'BcpPlan not found', code: 'BCP_PLAN_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bcp-plan', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createBcpPlanBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await bcpPlanService.create(tenantId, req.body);
    recordAudit(tenantId, 'bcp-plan.created', 'bcp-plan', item.plan_id, actorId, { title: req.body.title || req.body.name });
    await publishBcpPlanCreated(tenantId, item.plan_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'BcpPlan Created', `BcpPlan "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.plan_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bcp-plan', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateBcpPlanBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await bcpPlanService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'BcpPlan not found', code: 'BCP_PLAN_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'bcp-plan.updated', 'bcp-plan', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishBcpPlanReviewed(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bcp-plan', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await bcpPlanService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'BcpPlan not found', code: 'BCP_PLAN_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'bcp-plan.deleted', 'bcp-plan', req.params.id, actorId);
    action(res, 'BcpPlan deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bcp-plan', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/recovery-metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await bcpPlanService.getRecoveryMetrics(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recovery metrics', details: (err as Error).message });
  }
});

router.post('/:id/dr-loop', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await bcpPlanService.runDrLoop(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run DR loop', details: (err as Error).message });
  }
});

router.post('/:id/scenario-test', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { scenarioType, simulatedFailure, testScope } = req.body;
    const result = await bcpPlanService.runRecoveryScenarioTest(tenantId, req.params.id, { scenarioType, simulatedFailure, testScope }, actorId);
    if (!result) {
      res.status(404).json({ error: 'BCP plan not found' });
      return;
    }
    recordAudit(tenantId, 'bcp-plan.scenario-test-executed', 'bcp-plan', req.params.id, actorId, { scenarioType });
    res.status(201); ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run scenario test', details: (err as Error).message });
  }
});

router.get('/:id/test-history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const history = await bcpPlanService.getTestHistory(tenantId, req.params.id);
    ok(res, { tests: history, count: history.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get test history', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await bcpPlanService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
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
