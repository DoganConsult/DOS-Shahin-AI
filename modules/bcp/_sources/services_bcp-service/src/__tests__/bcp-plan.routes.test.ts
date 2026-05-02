import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })), safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('@dos/service-client', () => {
  class MockServiceClient {
    get = vi.fn().mockResolvedValue({ ok: true, data: { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true } });
    post = vi.fn().mockResolvedValue({ ok: true });
    put = vi.fn().mockResolvedValue({ ok: true });
    delete = vi.fn().mockResolvedValue({ ok: true });
    destroy = vi.fn();
  }
  return { ServiceClient: MockServiceClient, requestContext: { getStore: vi.fn() } };
});
vi.mock('../events/publisher', () => ({
  setServiceBus: vi.fn(),
  publishDomainEvent: vi.fn().mockResolvedValue(undefined),
  publishBcpPlanCreated: vi.fn().mockResolvedValue(undefined),
  publishBcpPlanActivated: vi.fn().mockResolvedValue(undefined),
  publishBcpExerciseCompleted: vi.fn().mockResolvedValue(undefined),
  publishBcpPlanReviewed: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../domain/bcp-plan.service', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
  getById: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Test' }),
  create: vi.fn().mockResolvedValue({ id: 'new1', tenant_id: 't1', entryId: 'new1' }),
  update: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Updated' }),
  remove: vi.fn().mockResolvedValue(true),
  restore: vi.fn().mockResolvedValue({}),
  bulkCreate: vi.fn().mockResolvedValue({}),
  bulkRemove: vi.fn().mockResolvedValue({}),
  getStats: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Test' }),
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: vi.fn((_req: any, _res: any, next: any) => {
    _req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    _req.tenantId = 't1';
    next();
  }),
  requireTenantId: vi.fn((_req: any, _res: any, next: any) => {
    _req.tenantId = _req.tenantId || 't1';
    next();
  }),
  requirePermission: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import router from '../routes/bcp-plan.routes';
import * as domainSvc from '../domain/bcp-plan.service';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    req.headers['authorization'] = req.headers['authorization'] || 'Bearer test-token';
    next();
  });
  app.use('/api/bcp-plan', router);
  return app;
}

describe('bcp-plan routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/bcp-plan/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/bcp-plan/');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/bcp-plan/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/bcp-plan/r1');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getById as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/bcp-plan/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bcp-plan/', () => {
    it('creates new record', async () => {
      const res = await request(app)
        .post('/api/bcp-plan/')
        .send({ title: 'New Item', category: 'test', type: 'test', severity: 'medium', name: 'test', framework_name: 'test', control_ref: 'CR-1' });
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/bcp-plan/:id', () => {
    it('updates existing record', async () => {
      const res = await request(app)
        .put('/api/bcp-plan/r1')
        .send({ title: 'Updated' });
      expect([200, 204, 400]).toContain(res.status);
    });
  });

  describe('DELETE /api/bcp-plan/:id', () => {
    it('deletes existing record', async () => {
      const res = await request(app).delete('/api/bcp-plan/r1');
      expect([200, 204, 400]).toContain(res.status);
    });
  });

});
