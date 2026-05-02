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
  publishApprovalRequested: vi.fn().mockResolvedValue(undefined),
  publishApprovalDecided: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../domain/approval.service', () => ({
  listApprovals: vi.fn().mockResolvedValue({ data: [{ approval_id: 'appr-1' }], total: 1 }),
  requestApproval: vi.fn().mockResolvedValue({ approval_id: 'appr-new', tenant_id: 't1', status: 'pending' }),
  approveRequest: vi.fn().mockResolvedValue({ approval_id: 'appr-1', status: 'approved' }),
  rejectRequest: vi.fn().mockResolvedValue({ approval_id: 'appr-1', status: 'rejected' }),
  escalateRequest: vi.fn().mockResolvedValue({ approval_id: 'appr-1', status: 'escalated' }),
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

import router from '../routes/approval.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/approval', router);
  app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ error: err.message }); });
  return app;
}

describe('approval routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/approval/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/approval/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /api/approval/', () => {
    it('creates new approval request', async () => {
      const res = await request(app)
        .post('/api/approval/')
        .send({ workflowInstanceId: 'wf-1', requestedBy: 'u1', approvers: ['u2'], subject: 'Approve' });
      expect(res.status).toBe(201);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/approval/').send({});
      expect(res.status).toBe(400);
    });
  });
});
