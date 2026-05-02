import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ safeQuery: vi.fn(), withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })) }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({ toErrorMessage: vi.fn((e: unknown) => String(e)) }));
vi.mock('@dos/module-sdk', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => fn(req, res, next).catch(next),
  publishEvent: vi.fn().mockResolvedValue(undefined),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../events/workflow.publishers', () => ({
  publishTaskAssigned: vi.fn().mockResolvedValue(undefined),
  publishTaskCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../domain/task.service', () => ({
  listTasks: vi.fn().mockResolvedValue({ data: [{ task_id: 'task-1' }], total: 1 }),
  getTask: vi.fn().mockResolvedValue({ task_id: 'task-1', tenant_id: 't1', title: 'Test Task' }),
  createTask: vi.fn().mockResolvedValue({ task_id: 'task-new', tenant_id: 't1' }),
  assignTask: vi.fn().mockResolvedValue({ task_id: 'task-1', assigned_to: 'u2' }),
  completeTask: vi.fn().mockResolvedValue({ task_id: 'task-1', status: 'completed' }),
  rejectTask: vi.fn().mockResolvedValue({ task_id: 'task-1', status: 'rejected' }),
  reassignTask: vi.fn().mockResolvedValue({ task_id: 'task-1', assigned_to: 'u3' }),
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

import router from '../routes/task.routes';
import * as domainSvc from '../domain/task.service';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/task', router);
  app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ error: err.message }); });
  return app;
}

describe('task routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/task/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/task/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/task/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/task/task-1');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getTask as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/task/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/task/', () => {
    it('creates new task', async () => {
      const res = await request(app)
        .post('/api/task/')
        .send({ instanceId: 'wf-1', taskType: 'review', title: 'Review doc' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/task/')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
