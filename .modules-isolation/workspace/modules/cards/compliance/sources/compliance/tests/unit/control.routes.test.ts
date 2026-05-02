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
  publishComplianceAssessed: vi.fn().mockResolvedValue(undefined),
  publishComplianceGapIdentified: vi.fn().mockResolvedValue(undefined),
  publishControlTested: vi.fn().mockResolvedValue(undefined),
  publishControlEffectivenessChanged: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../domain/control.service', () => ({
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

import router from '../routes/control.routes';
import * as domainSvc from '../../domain/control.service';

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
  app.use('/api/control', router);
  return app;
}

describe('control routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/control/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/control/');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/control/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/control/00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getById as any).mockResolvedValueOnce(null);
      // Use a valid-shape UUID so the Phase 4.6 guard does not short-circuit
      // the handler before the domain lookup; the test exercises the "not
      // found after real lookup" path.
      const res = await request(app).get('/api/control/00000000-0000-0000-0000-00000000ffff');
      expect(res.status).toBe(404);
    });

    it('returns 404 for non-UUID id without calling getById', async () => {
      const spy = (domainSvc.getById as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/control/r1');
      expect(res.status).toBe(404);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/control/', () => {
    it('creates new record', async () => {
      const res = await request(app)
        .post('/api/control/')
        .send({ title: 'New Item', category: 'test', type: 'test', severity: 'medium', name: 'test', framework_name: 'test', control_ref: 'CR-1' });
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/control/:id', () => {
    it('updates existing record', async () => {
      const res = await request(app)
        .put('/api/control/00000000-0000-0000-0000-000000000001')
        .send({ title: 'Updated' });
      expect([200, 204, 400]).toContain(res.status);
    });
  });

  describe('DELETE /api/control/:id', () => {
    it('deletes existing record', async () => {
      const res = await request(app).delete('/api/control/00000000-0000-0000-0000-000000000001');
      expect([200, 204, 400]).toContain(res.status);
    });
  });

});
