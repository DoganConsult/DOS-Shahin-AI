import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({
  withTenantClient: vi.fn(),
  query: vi.fn(),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  publishEvent: vi.fn().mockResolvedValue(undefined),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: { roleAssigned: vi.fn(), roleRevoked: vi.fn(), observeDb: vi.fn() },
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireTenantId: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../domain/role.service', () => ({
  listAvailableRoles: vi.fn().mockResolvedValue([{ role_code: 'admin', count: 2 }]),
  listUserRoles:      vi.fn().mockResolvedValue([{ assignment_id: 'a1' }]),
  assignRole:         vi.fn().mockResolvedValue({ assignment_id: 'a1', role_code: 'admin' }),
  revokeRole:         vi.fn().mockResolvedValue(true),
}));

import { roleRouter } from '../routes/role.routes';
import * as roleService from '../domain/role.service';

function mkApp(role = 'admin') {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', role, roles: [role] };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/roles', roleRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('role.routes', () => {
  it('GET / lists tenant roles', async () => {
    const res = await request(mkApp()).get('/api/roles');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /users/:userId lists assignments', async () => {
    const res = await request(mkApp()).get('/api/roles/users/u1');
    expect(res.status).toBe(200);
  });

  it('POST /users/:userId assigns (admin + Zod)', async () => {
    const res = await request(mkApp())
      .post('/api/roles/users/u1')
      .send({ functionalRoleCode: 'admin' });
    expect(res.status).toBe(201);
  });

  it('POST /users/:userId 400 without functionalRoleCode', async () => {
    const res = await request(mkApp()).post('/api/roles/users/u1').send({});
    expect(res.status).toBe(400);
  });

  it('POST /users/:userId 403 for viewer', async () => {
    const res = await request(mkApp('viewer'))
      .post('/api/roles/users/u1')
      .send({ functionalRoleCode: 'admin' });
    expect(res.status).toBe(403);
  });

  it('DELETE /users/:userId/:roleCode revokes', async () => {
    const res = await request(mkApp()).delete('/api/roles/users/u1/admin');
    expect(res.status).toBe(200);
  });

  it('DELETE /users/:userId/:roleCode 404 when nothing revoked', async () => {
    (roleService.revokeRole as any).mockResolvedValueOnce(false);
    const res = await request(mkApp()).delete('/api/roles/users/u1/ghost');
    expect(res.status).toBe(404);
  });
});
