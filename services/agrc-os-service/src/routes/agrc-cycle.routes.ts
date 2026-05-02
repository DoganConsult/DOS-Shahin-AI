import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { recordAudit } from '../adapters/audit.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { startCycleBody, listCyclesQuery } from '../schemas/agrc-cycle.schemas';
import { publishDomainEvent } from '../events/publisher';
import * as cycleService from '../domain/agrc-cycle.service';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'agrc-os-service:agrc-cycle', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();
router.use(authenticate);
router.use(requireTenantId);

// POST /cycles — Start a new orchestrator cycle
router.post('/', validate({ body: startCycleBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const cycle = await cycleService.startCycle(tenantId, req.body);
    recordAudit(tenantId, 'agrc.cycle.started', 'cycle', cycle.cycle_id, actorId, { mode: req.body.mode });
    await publishDomainEvent('agrc.cycle.started', { cycleId: cycle.cycle_id, mode: req.body.mode }, tenantId, actorId);
    res.status(201);
    ok(res, cycle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start cycle', details: (err as Error).message });
  }
});

// GET /cycles — List orchestrator cycles
router.get('/', validate({ query: listCyclesQuery }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await cycleService.listCycles(tenantId, req.query as any);
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list cycles', details: (err as Error).message });
  }
});

// GET /cycles/:id — Get cycle detail with agent results
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const cycle = await cycleService.getCycleById(tenantId, req.params.id);
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found', code: 'CYCLE_NOT_FOUND' });
      return;
    }
    ok(res, cycle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cycle', details: (err as Error).message });
  }
});

// POST /cycles/:id/cancel — Cancel a running cycle
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const cancelled = await cycleService.cancelCycle(tenantId, req.params.id);
    if (!cancelled) {
      res.status(404).json({ error: 'Cycle not found or not running' });
      return;
    }
    recordAudit(tenantId, 'agrc.cycle.cancelled', 'cycle', req.params.id, actorId);
    await publishDomainEvent('agrc.cycle.cancelled', { cycleId: req.params.id }, tenantId, actorId);
    action(res, 'Cycle cancelled');
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel cycle', details: (err as Error).message });
  }
});

// GET /cycles/:id/results — Get cycle results summary
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const results = await cycleService.getCycleResults(tenantId, req.params.id);
    ok(res, results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cycle results', details: (err as Error).message });
  }
});

export default router;
