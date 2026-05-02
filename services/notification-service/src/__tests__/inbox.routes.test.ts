import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })), safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({ toErrorMessage: vi.fn((e: unknown) => String(e)) }));

vi.mock('../domain/inbox.service', () => ({
  listInbox: vi.fn().mockResolvedValue({ items: [{ id: 'i1' }], total: 1 }),
  getInboxCount: vi.fn().mockResolvedValue(5),
  markInboxItemRead: vi.fn().mockResolvedValue(true),
  markAllInboxRead: vi.fn().mockResolvedValue(3),
  dismissInboxItem: vi.fn().mockResolvedValue(true),
}));

import router from '../routes/inbox.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/inbox', router);
  return app;
}

describe('inbox routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/inbox/', () => {
    it('returns list when userId provided', async () => {
      const res = await request(app).get('/api/inbox/?userId=u1');
      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
    });

    it('returns 400 without userId', async () => {
      const res = await request(app).get('/api/inbox/');
      expect(res.status).toBe(400);
    });
  });
});
