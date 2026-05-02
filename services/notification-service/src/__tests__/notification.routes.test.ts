import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })), safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({ toErrorMessage: vi.fn((e: unknown) => String(e)) }));

vi.mock('../domain/notification.service', () => ({
  listNotifications: vi.fn().mockResolvedValue({ data: [{ notification_id: 'n1' }], total: 1 }),
  getNotification: vi.fn().mockResolvedValue({ notification_id: 'n1', tenant_id: 't1', title: 'Test' }),
  createNotification: vi.fn().mockResolvedValue({ notification_id: 'n-new', tenant_id: 't1' }),
  markNotificationRead: vi.fn().mockResolvedValue({ notification_id: 'n1', read: true }),
  markAllRead: vi.fn().mockResolvedValue(5),
  deleteNotification: vi.fn().mockResolvedValue(true),
  getUnreadCount: vi.fn().mockResolvedValue(3),
  sendViaChannel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../domain/sse.service', () => ({
  addSseClient: vi.fn(),
  getSseClientCount: vi.fn().mockReturnValue(0),
}));

import router from '../routes/notification.routes';
import * as domainSvc from '../domain/notification.service';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/notification', router);
  return app;
}

describe('notification routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/notification/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/notification/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/notification/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/notification/n1');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getNotification as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/notification/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/notification/', () => {
    it('creates new notification', async () => {
      const res = await request(app)
        .post('/api/notification/')
        .send({ userId: 'u1', title: 'Alert', body: 'Test body', type: 'info' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/notification/').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/notification/:id', () => {
    it('deletes existing record', async () => {
      const res = await request(app).delete('/api/notification/n1');
      expect(res.status).toBe(200);
    });
  });
});
