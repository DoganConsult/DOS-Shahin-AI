import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Zod validation runs before the handler — so POST requires name_en + bu_id.
// Domain calls are mocked so no DB is needed.

vi.mock('@dos/db', () => ({
  withTenantClient: vi.fn(),
  query: vi.fn(),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: {
    deptCreated: vi.fn(), deptUpdated: vi.fn(), deptDeleted: vi.fn(),
    observeDb: vi.fn(),
  },
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: (req: any, _res: any, next: any) => next(),
  requireTenantId: (req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (req: any, _res: any, next: any) => next(),
}));

vi.mock('../domain/department.service', () => ({
  getDepartments: vi.fn().mockResolvedValue({ rows: [{ id: 'r1', tenant_id: 't1', name_en: 'Test Dept' }], count: 1 }),
  getDepartmentById: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', name_en: 'Test Dept' }),
  createDepartment: vi.fn().mockResolvedValue({ id: 'new1', dept_id: 'new1', tenant_id: 't1', name_en: 'New Dept' }),
  updateDepartment: vi.fn().mockResolvedValue({ id: 'r1', dept_id: 'r1', tenant_id: 't1', name_en: 'Updated Dept' }),
  deleteDepartment: vi.fn().mockResolvedValue({ deleted: true }),
}));

import { departmentRouter } from '../routes/department.routes';
import * as domainSvc from '../domain/department.service';

function createApp(role: string = 'admin') {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role, roles: [role] };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/departments', departmentRouter);
  // Catch UserServiceError/Zod errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

describe('department routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / returns list', async () => {
    const res = await request(createApp()).get('/api/departments/');
    expect(res.status).toBe(200);
    expect(res.body.departments).toBeDefined();
    expect(res.body.success).toBe(true);
  });

  it('GET /:id returns single record', async () => {
    const res = await request(createApp()).get('/api/departments/r1');
    expect(res.status).toBe(200);
    expect(res.body.data?.id).toBe('r1');
  });

  it('GET /:id returns 404 for missing record', async () => {
    (domainSvc.getDepartmentById as any).mockResolvedValueOnce(null);
    const res = await request(createApp()).get('/api/departments/missing');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('DEPARTMENT_NOT_FOUND');
  });

  it('POST creates new record with valid body', async () => {
    const res = await request(createApp())
      .post('/api/departments/')
      .send({ name_en: 'New Dept', bu_id: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST returns 400 for missing required fields (Zod)', async () => {
    const res = await request(createApp()).post('/api/departments/').send({});
    expect(res.status).toBe(400);
  });

  it('POST returns 403 for non-admin actor', async () => {
    const res = await request(createApp('viewer'))
      .post('/api/departments/')
      .send({ name_en: 'New', bu_id: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_PROFILE_UPDATE');
  });

  it('PUT updates existing record', async () => {
    const res = await request(createApp()).put('/api/departments/r1').send({ name_en: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT returns 404 when service reports not found', async () => {
    (domainSvc.updateDepartment as any).mockResolvedValueOnce(null);
    const res = await request(createApp()).put('/api/departments/ghost').send({ name_en: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE deletes existing record', async () => {
    const res = await request(createApp()).delete('/api/departments/r1');
    expect(res.status).toBe(200);
  });

  it('DELETE returns 404 when service reports not found', async () => {
    (domainSvc.deleteDepartment as any).mockResolvedValueOnce({ deleted: false });
    const res = await request(createApp()).delete('/api/departments/ghost');
    expect(res.status).toBe(404);
  });
});
