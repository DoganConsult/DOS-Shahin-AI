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

vi.mock('../domain/schedule.service', () => ({
  listScheduledJobs: vi.fn().mockResolvedValue({ data: [{ job_id: 'job-1' }], total: 1 }),
  registerScheduledJob: vi.fn().mockResolvedValue({ job_id: 'job-new', tenant_id: 't1' }),
  triggerScheduledJob: vi.fn().mockResolvedValue({ job_id: 'job-1', last_triggered_at: '2026-01-01' }),
  deactivateScheduledJob: vi.fn().mockResolvedValue({ job_id: 'job-1', is_active: false }),
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

import router from '../routes/schedule.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/schedule', router);
  app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ error: err.message }); });
  return app;
}

describe('schedule routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/schedule/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/schedule/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /api/schedule/', () => {
    it('creates new scheduled job', async () => {
      const res = await request(app)
        .post('/api/schedule/')
        .send({ name: 'Daily Scan', cronExpression: '0 0 * * *', jobType: 'scan' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/schedule/').send({});
      expect(res.status).toBe(400);
    });
  });
});
