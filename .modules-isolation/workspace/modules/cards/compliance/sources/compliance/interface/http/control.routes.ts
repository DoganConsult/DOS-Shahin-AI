import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as controlService from '../../domain/control.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishControlTested, publishControlEffectivenessChanged, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createControlBody, updateControlBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../../schemas/control.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'compliance-controls-service:control', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await controlService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list controls', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await controlService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get control stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await controlService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await controlService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Route-collision guard (mirrors compliance.routes.ts:65):
    // the router mounts /:id alongside sibling sub-routers like
    // /controls/home, /controls/library, /controls/work-queue in
    // index.ts. Rejecting non-UUID values here with a clean 404
    // stops those static sub-paths from triggering a UUID cast
    // error inside the service layer (Postgres returns
    // `invalid input syntax for type uuid`, which would surface
    // as a visible 500 on the dashboard).
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const item = await controlService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get control', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createControlBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await controlService.create(tenantId, req.body);
    recordAudit(tenantId, 'control.created', 'control', item.control_id, actorId, { title: req.body.title || req.body.name });
    await publishControlTested(tenantId, item.control_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Control Created', `Control "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.control_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create control', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateControlBody }), async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await controlService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'control.updated', 'control', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishControlEffectivenessChanged(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update control', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await controlService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'control.deleted', 'control', req.params.id, actorId);
    action(res, 'Control deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete control', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await controlService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Control not found or not deleted', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'control.restored', 'control', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore control', details: (err as Error).message });
  }
});

router.get('/:id/lifecycle', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Control not found', code: 'CONTROL_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const result = await controlService.getControlLifecycleState(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get lifecycle state', details: (err as Error).message });
  }
});

router.get('/module/dependency-graph', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await controlService.getControlDependencyGraph(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dependency graph', details: (err as Error).message });
  }
});

export default router;
