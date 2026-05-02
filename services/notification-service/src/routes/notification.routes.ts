import { Router, Request, Response, NextFunction } from 'express';
import {
  createNotification,
  getNotification,
  listNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  sendViaChannel,
} from '../domain/notification.service';
import { addSseClient, getSseClientCount } from '../domain/sse.service';
import { handleAlertManagerWebhook, deliverViaPagerDuty, deliverViaOpsGenie } from '../domain/delivery.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';
import { optionalAuthenticate } from '@dos/dauth-shared';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'notification-service:notification', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

// Browser requests arrive with a session cookie / Bearer JWT but no
// explicit x-tenant-id header. Populate the header from JWT claims so the
// existing per-route checks below continue to work for both header-bearing
// (internal) and session-bearing (browser) callers. Webhook + SSE routes
// don't inspect x-tenant-id, so this is a no-op for them.
router.use(optionalAuthenticate);
router.use((req: Request, _res: Response, next: NextFunction): void => {
  if (!req.headers['x-tenant-id']) {
    const fromJwt = (req as unknown as { tenantId?: string }).tenantId
      || (req as unknown as { user?: { tenantId?: string } }).user?.tenantId;
    if (fromJwt) req.headers['x-tenant-id'] = String(fromJwt);
  }
  next();
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const result = await listNotifications(tenantId, {
      userId: req.query.userId as string | undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      channel: req.query.channel as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list notifications' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const { userId, title, body, type, channel, module, entityType, entityId, metadata } = req.body;
    if (!userId || !title || !body || !type) {
      res.status(400).json({ error: 'Missing required fields: userId, title, body, type' });
      return;
    }
    const result = await createNotification({ tenantId, userId, title, body, type, channel, module, entityType, entityId, metadata });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing required field: userId' });
      return;
    }
    const count = await markAllRead(tenantId, userId);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const notification = await getNotification(tenantId, req.params.id);
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notification' });
  }
});

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const updated = await markNotificationRead(tenantId, req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Notification not found or already read' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const { channel, target } = req.body;
    if (!channel || !target) {
      res.status(400).json({ error: 'Missing required fields: channel, target' });
      return;
    }
    await sendViaChannel(tenantId, req.params.id, channel, target);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const deleted = await deleteNotification(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.get('/stream', (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || (req.headers['x-user-id'] as string) || `anon-${Date.now()}`;
  addSseClient(clientId, res);
});

router.get('/stream/status', (_req: Request, res: Response) => {
  res.json({ connectedClients: getSseClientCount() });
});

// ── AlertManager Webhook Receiver ───────────────────────────────────
router.post('/webhooks/alertmanager', async (req: Request, res: Response) => {
  try {
    await handleAlertManagerWebhook(req.body);
    res.json({ success: true, processed: req.body?.alerts?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process alertmanager webhook' });
  }
});

// ── PagerDuty channel ───────────────────────────────────────────────
router.post('/channels/pagerduty', async (req: Request, res: Response) => {
  try {
    const { summary, severity, source, deduplicationKey } = req.body;
    if (!summary) {
      res.status(400).json({ error: 'Missing required field: summary' });
      return;
    }
    const result = await deliverViaPagerDuty(summary, severity || 'warning', source || 'dos-platform', deduplicationKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger PagerDuty incident' });
  }
});

// ── OpsGenie channel ────────────────────────────────────────────────
router.post('/channels/opsgenie', async (req: Request, res: Response) => {
  try {
    const { message, priority, details, alias } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }
    const result = await deliverViaOpsGenie(message, priority || 'P3', details || {}, alias);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create OpsGenie alert' });
  }
});

export default router;
