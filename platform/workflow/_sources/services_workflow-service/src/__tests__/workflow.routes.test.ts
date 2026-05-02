import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ safeQuery: vi.fn(), withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })) }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('@dos/module-sdk', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => fn(req, res, next).catch(next),
  publishEvent: vi.fn().mockResolvedValue(undefined),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../events/workflow.publishers', () => ({
  publishWorkflowCreated: vi.fn().mockResolvedValue(undefined),
  publishWorkflowAdvanced: vi.fn().mockResolvedValue(undefined),
  publishWorkflowCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../domain/workflow.service', () => ({
  listWorkflowInstances: vi.fn().mockResolvedValue({ data: [{ instance_id: 'wf-1', status: 'pending' }], total: 1 }),
  getWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-1', tenant_id: 't1', status: 'pending' }),
  createWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-new', tenant_id: 't1', status: 'pending' }),
  updateWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-1', tenant_id: 't1', status: 'in_progress' }),
  advanceWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-1' }),
  completeWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-1', status: 'completed' }),
  cancelWorkflowInstance: vi.fn().mockResolvedValue({ instance_id: 'wf-1', status: 'cancelled' }),
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: vi.fn((_req, _res, next) => {
    _req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    _req.tenantId = 't1';
    next();
  }),
  requireTenantId: vi.fn((_req, _res, next) => { _req.tenantId = _req.tenantId || 't1'; next(); }),
  requirePermission: vi.fn(() => (_req, _res, next) => next()),
}));

import router from '../routes/workflow.routes';
import * as domainSvc from '../domain/workflow.service';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/workflow', router);
  app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ error: err.message }); });
  return app;
}

describe('workflow routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/workflow/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/workflow/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/workflow/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/workflow/wf-1');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getWorkflowInstance as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/workflow/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/workflow/', () => {
    it('creates new workflow instance', async () => {
      const res = await request(app)
        .post('/api/workflow/')
        .send({ workflowType: 'approval', createdBy: 'u1', name: 'Test' });
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/workflow/')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/workflow/:id', () => {
    it('updates existing record', async () => {
      const res = await request(app)
        .put('/api/workflow/wf-1')
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
    });
  });
});
