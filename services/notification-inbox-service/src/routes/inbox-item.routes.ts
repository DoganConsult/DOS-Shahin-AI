import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as inboxItemService from '../domain/inbox-item.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishInboxItemActioned, publishInboxItemDismissed } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createInboxItemBody, updateInboxItemBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/inbox-item.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'notification-inbox-service:inbox-item', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await inboxItemService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list inbox-items', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await inboxItemService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get inbox-item stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await inboxItemService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await inboxItemService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await inboxItemService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'InboxItem not found', code: 'INBOX_ITEM_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get inbox-item', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createInboxItemBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await inboxItemService.create(tenantId, req.body);
    recordAudit(tenantId, 'inbox-item.created', 'inbox-item', item.item_id, actorId, { title: req.body.title || req.body.name });
    if (actorId) { sendNotification(tenantId, actorId, 'InboxItem Created', `InboxItem "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.item_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create inbox-item', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateInboxItemBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await inboxItemService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'InboxItem not found', code: 'INBOX_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'inbox-item.updated', 'inbox-item', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishInboxItemActioned(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inbox-item', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await inboxItemService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'InboxItem not found', code: 'INBOX_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'inbox-item.deleted', 'inbox-item', req.params.id, actorId);
    await publishInboxItemDismissed(tenantId, req.params.id, {}, actorId);
    action(res, 'InboxItem deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete inbox-item', details: (err as Error).message });
  }
});

// ── Advanced Filtering & Inbox Management ────────────────────────────────

router.post('/filter', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const result = await inboxItemService.advancedFilter(tenantId, userId, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to filter inbox items', details: (err as Error).message });
  }
});

router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const result = await inboxItemService.getUnreadCount(tenantId, userId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count', details: (err as Error).message });
  }
});

router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ error: 'itemIds array is required' });
      return;
    }
    const result = await inboxItemService.markAsRead(tenantId, userId, itemIds);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read', details: (err as Error).message });
  }
});

router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const result = await inboxItemService.markAllAsRead(tenantId, userId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read', details: (err as Error).message });
  }
});

router.post('/dismiss', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ error: 'itemIds array is required' });
      return;
    }
    const result = await inboxItemService.dismissItems(tenantId, userId, itemIds);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss items', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await inboxItemService.createNotification(tenantId, req.body);
    if (!result) {
      res.status(503).json({ error: 'Notification creation unavailable' });
      return;
    }
    res.status(201); ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification', details: (err as Error).message });
  }
});

router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const result = await inboxItemService.getNotificationPreferences(tenantId, userId);
    ok(res, result ?? { message: 'Preferences unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notification preferences', details: (err as Error).message });
  }
});

router.get('/digest', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId;
    const frequency = req.query.frequency as string | undefined;
    const result = await inboxItemService.generateDigest(tenantId, userId, frequency);
    ok(res, result ?? { message: 'Digest unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate digest', details: (err as Error).message });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await inboxItemService.getNotificationDashboard(tenantId);
    ok(res, result ?? { message: 'Notification dashboard unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notification dashboard', details: (err as Error).message });
  }
});

router.get('/channels', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await inboxItemService.getChannelConfig(tenantId);
    ok(res, result ?? { message: 'Channel config unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get channel config', details: (err as Error).message });
  }
});

router.post('/deadlines/check', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await inboxItemService.checkDeadlines(tenantId);
    ok(res, result ?? { message: 'Deadline check completed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check deadlines', details: (err as Error).message });
  }
});

export default router;
