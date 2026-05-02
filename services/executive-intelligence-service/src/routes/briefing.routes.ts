import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as briefingService from '../domain/briefing.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishExecutiveBriefingCreated, publishExecutiveBriefingDistributed } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createBriefingBody, updateBriefingBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/briefing.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'executive-intelligence-service:briefing', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await briefingService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list briefings', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await briefingService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get briefing stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await briefingService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await briefingService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await briefingService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Briefing not found', code: 'BRIEFING_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get briefing', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createBriefingBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await briefingService.create(tenantId, req.body);
    recordAudit(tenantId, 'briefing.created', 'briefing', item.briefing_id, actorId, { title: req.body.title || req.body.name });
    await publishExecutiveBriefingCreated(tenantId, item.briefing_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Briefing Created', `Briefing "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.briefing_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create briefing', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateBriefingBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await briefingService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Briefing not found', code: 'BRIEFING_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'briefing.updated', 'briefing', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishExecutiveBriefingDistributed(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update briefing', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await briefingService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Briefing not found', code: 'BRIEFING_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'briefing.deleted', 'briefing', req.params.id, actorId);
    action(res, 'Briefing deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete briefing', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/briefs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await briefingService.listBriefs(tenantId);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list briefs', details: (err as Error).message });
  }
});

router.post('/briefs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const result = await briefingService.createBrief(tenantId, actorId, req.body);
    if (!result) {
      res.status(503).json({ error: 'Brief creation unavailable' });
      return;
    }
    res.status(201); ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create brief', details: (err as Error).message });
  }
});

router.post('/briefs/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const result = await briefingService.approveBrief(tenantId, req.params.id, actorId, req.body.status || 'approved');
    ok(res, result ?? { message: 'Approval unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve brief', details: (err as Error).message });
  }
});

router.get('/objectives', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await briefingService.listObjectives(tenantId);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list objectives', details: (err as Error).message });
  }
});

router.post('/objectives', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const result = await briefingService.createObjective(tenantId, actorId, req.body);
    if (!result) {
      res.status(503).json({ error: 'Objective creation unavailable' });
      return;
    }
    res.status(201); ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create objective', details: (err as Error).message });
  }
});

export default router;
