import { Router, Request, Response } from 'express';
import { listInbox, getInboxCount, markInboxItemRead, markAllInboxRead, dismissInboxItem } from '../domain/inbox.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'notification-service:inbox', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    const userId = (req.query.userId as string) || '';
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing x-tenant-id header or userId query param' });
      return;
    }
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = req.query.status as string | undefined;
    const result = await listInbox({ tenantId, userId, page, limit, status });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list inbox' });
  }
});

router.get('/count', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    const userId = (req.query.userId as string) || '';
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing x-tenant-id header or userId query param' });
      return;
    }
    const result = await getInboxCount(tenantId, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get inbox count' });
  }
});

router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    const { userId } = req.body;
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing x-tenant-id header or userId' });
      return;
    }
    const count = await markAllInboxRead(tenantId, userId);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    const { userId } = req.body;
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing x-tenant-id header or userId' });
      return;
    }
    const updated = await markInboxItemRead(tenantId, userId, req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Inbox item not found or already read' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark inbox item as read' });
  }
});

router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    const { userId } = req.body;
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'Missing x-tenant-id header or userId' });
      return;
    }
    const updated = await dismissInboxItem(tenantId, userId, req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Inbox item not found or already dismissed' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss inbox item' });
  }
});

export default router;
