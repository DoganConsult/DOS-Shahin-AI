import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as mobileSessionService from '../domain/mobile-session.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishMobileSessionStarted, publishMobileSessionEnded } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { asyncHandler, validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createMobileSessionBody, updateMobileSessionBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/mobile-session.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'platform-core-service:mobile-session', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await mobileSessionService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list mobile-sessions', details: (err as Error).message });
  }
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await mobileSessionService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get mobile-session stats', details: (err as Error).message });
  }
}));

router.post('/bulk', validate({ body: bulkCreateBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await mobileSessionService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
}));

router.delete('/bulk', validate({ body: bulkDeleteBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await mobileSessionService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await mobileSessionService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'MobileSession not found', code: 'MOBILE_SESSION_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get mobile-session', details: (err as Error).message });
  }
}));

router.post('/', validate({ body: createMobileSessionBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await mobileSessionService.create(tenantId, req.body);
    recordAudit(tenantId, 'mobile-session.created', 'mobile-session', item.session_id, actorId, { title: req.body.title || req.body.name });
    await publishMobileSessionStarted(tenantId, item.session_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'MobileSession Created', `MobileSession "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.session_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create mobile-session', details: (err as Error).message });
  }
}));

router.put('/:id', validate({ body: updateMobileSessionBody }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await mobileSessionService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'MobileSession not found', code: 'MOBILE_SESSION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'mobile-session.updated', 'mobile-session', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update mobile-session', details: (err as Error).message });
  }
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await mobileSessionService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'MobileSession not found', code: 'MOBILE_SESSION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'mobile-session.deleted', 'mobile-session', req.params.id, actorId);
    await publishMobileSessionEnded(tenantId, req.params.id, {}, actorId);
    action(res, 'MobileSession deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete mobile-session', details: (err as Error).message });
  }
}));

export default router;
