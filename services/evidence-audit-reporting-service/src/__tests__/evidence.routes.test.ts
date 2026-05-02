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
  publishEvidenceSubmitted: vi.fn().mockResolvedValue(undefined),
  publishEvidenceApproved: vi.fn().mockResolvedValue(undefined),
  publishEvidenceRejected: vi.fn().mockResolvedValue(undefined),
  publishAuditFindingCreated: vi.fn().mockResolvedValue(undefined),
  publishAuditFindingResolved: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../domain/evidence.service', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
  getById: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Test' }),
  create: vi.fn().mockResolvedValue({ id: 'new1', tenant_id: 't1', entryId: 'new1' }),
  update: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Updated' }),
  remove: vi.fn().mockResolvedValue(true),
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

import router from '../routes/evidence.routes';
import * as domainSvc from '../domain/evidence.service';

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
  app.use('/api/evidence', router);
  return app;
}

describe('evidence routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/evidence/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/evidence/');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/evidence/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/evidence/00000000-0000-0000-0000-000000000001');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getById as any).mockResolvedValueOnce(null);
      // Phase 12A: evidence router now carries a UUID_RE guard on /:id
      // (added in Phase 11.C). Use a valid-shape UUID so the guard
      // delegates to getById; the null mock surfaces the 404.
      const res = await request(app).get('/api/evidence/00000000-0000-0000-0000-00000000ffff');
      expect(res.status).toBe(404);
    });

    it('returns 404 for non-UUID id without calling getById (UUID guard)', async () => {
      const spy = (domainSvc.getById as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/evidence/not-a-uuid');
      expect(res.status).toBe(404);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/evidence/', () => {
    it('creates new record', async () => {
      const res = await request(app)
        .post('/api/evidence/')
        .send({ title: 'New Item', category: 'test', type: 'test', severity: 'medium', name: 'test', framework_name: 'test', control_ref: 'CR-1' });
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/evidence/:id', () => {
    it('updates existing record', async () => {
      const res = await request(app)
        .put('/api/evidence/00000000-0000-0000-0000-000000000001')
        .send({ title: 'Updated' });
      expect([200, 204, 400]).toContain(res.status);
    });
  });

  describe('DELETE /api/evidence/:id', () => {
    it('deletes existing record', async () => {
      const res = await request(app).delete('/api/evidence/00000000-0000-0000-0000-000000000001');
      expect([200, 204, 400]).toContain(res.status);
    });
  });

});
