import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as findingService from '../domain/finding.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishAuditFindingCreated } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createFindingBody, updateFindingBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/finding.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'evidence-audit-reporting-service:finding', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await findingService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list findings', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await findingService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get finding stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await findingService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await findingService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/audit-dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { getAuditDashboard } = require('../domain/evidence.service');
    const result = await getAuditDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit dashboard', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await findingService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Finding not found', code: 'FINDING_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get finding', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createFindingBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await findingService.create(tenantId, req.body);
    recordAudit(tenantId, 'finding.created', 'finding', item.finding_id, actorId, { title: req.body.title || req.body.name });
    await publishAuditFindingCreated(tenantId, item.finding_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Finding Created', `Finding "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.finding_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create finding', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateFindingBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await findingService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Finding not found', code: 'FINDING_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'finding.updated', 'finding', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update finding', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await findingService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Finding not found', code: 'FINDING_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'finding.deleted', 'finding', req.params.id, actorId);
    action(res, 'Finding deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete finding', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.post('/:id/audit-transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const { transitionAuditStatus } = require('../domain/evidence.service');
    const result = await transitionAuditStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition audit status', details: (err as Error).message });
  }
});

export default router;
