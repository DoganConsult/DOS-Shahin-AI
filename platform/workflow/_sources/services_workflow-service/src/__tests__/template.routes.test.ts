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

vi.mock('../domain/workflow-template.service', () => ({
  listTemplates: vi.fn().mockResolvedValue({ data: [{ template_id: 'tpl-1' }], total: 1 }),
  getTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-1', tenant_id: 't1', name: 'Test' }),
  getTemplateByCode: vi.fn().mockResolvedValue({ template_id: 'tpl-1', template_code: 'approval' }),
  createTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-new', tenant_id: 't1' }),
  updateTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-1', name: 'Updated' }),
  deactivateTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-1', is_active: false }),
  activateTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-1', is_active: true }),
  getTemplateVersions: vi.fn().mockResolvedValue([]),
  rollbackToVersion: vi.fn().mockResolvedValue({ template_id: 'tpl-1' }),
  serializeTemplate: vi.fn().mockResolvedValue({}),
  importTemplate: vi.fn().mockResolvedValue({ template_id: 'tpl-imported' }),
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

import router from '../routes/template.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', tenantId: 't1' };
    req.tenantId = 't1';
    req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 't1';
    next();
  });
  app.use('/api/template', router);
  app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ error: err.message }); });
  return app;
}

describe('template routes', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = createApp(); });

  describe('GET /api/template/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/template/');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/template/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/template/tpl-1');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/template/', () => {
    it('creates new template', async () => {
      const res = await request(app)
        .post('/api/template/')
        .send({ templateCode: 'approval', name: 'Approval WF', definition: { steps: [] } });
      expect(res.status).toBe(201);
    });
  });
});
