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
  userMetrics: {
    userCreated: vi.fn(), userUpdated: vi.fn(), userDeactivated: vi.fn(),
    observeDb: vi.fn(),
  },
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireTenantId: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../domain/user.service', () => ({
  listUsers:      vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }], total: 1 }),
  getUserById:    vi.fn().mockResolvedValue({ user_id: 'u1', email: 'a@b' }),
  createUser:     vi.fn().mockResolvedValue({ user_id: 'new-u', email: 'new@x', tenant_id: 't1' }),
  updateUser:     vi.fn().mockResolvedValue({ user_id: 'u1', email: 'a@b' }),
  deactivateUser: vi.fn().mockResolvedValue({ user_id: 'u1', status: 'inactive' }),
}));

vi.mock('../domain/role-assignment.service', () => ({
  listRoleAssignments:   vi.fn().mockResolvedValue([{ assignment_id: 'a1', role_code: 'admin' }]),
  assignRole:            vi.fn().mockResolvedValue({ assignment_id: 'a1', role_code: 'admin' }),
  revokeRoleAssignment:  vi.fn().mockResolvedValue(true),
}));

import { userRouter } from '../routes/user.routes';
import * as userService from '../domain/user.service';
import * as raService from '../domain/role-assignment.service';

function mkApp(role = 'admin', userId = 'u1') {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, role, roles: [role] };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/users', userRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code, detail: err.detail });
  });
  return app;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('user.routes', () => {
  it('GET / returns paginated list', async () => {
    const res = await request(mkApp()).get('/api/users?page=1&pageSize=10');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.page).toBe(1);
  });

  it('GET /me returns current user', async () => {
    const res = await request(mkApp()).get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user_id).toBe('u1');
  });

  it('GET /me returns 404 when user missing', async () => {
    (userService.getUserById as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).get('/api/users/me');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('GET /:id returns 404 when user missing', async () => {
    (userService.getUserById as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).get('/api/users/ghost');
    expect(res.status).toBe(404);
  });

  it('POST / creates user with valid Zod payload', async () => {
    const res = await request(mkApp())
      .post('/api/users')
      .send({ email: 'new@x.com', name: 'New', role: 'member' });
    expect(res.status).toBe(201);
    expect(res.body.data.user_id).toBe('new-u');
  });

  it('POST / rejects missing email (Zod 400)', async () => {
    const res = await request(mkApp()).post('/api/users').send({ name: 'No Email' });
    expect(res.status).toBe(400);
  });

  it('POST / denies non-admin', async () => {
    const res = await request(mkApp('viewer'))
      .post('/api/users')
      .send({ email: 'x@y.com', name: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('UNAUTHORIZED_PROFILE_UPDATE');
  });

  it('PUT /:id allows user updating own profile', async () => {
    const res = await request(mkApp('viewer', 'u1'))
      .put('/api/users/u1')
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
  });

  it('PUT /:id denies non-admin updating someone else', async () => {
    const res = await request(mkApp('viewer', 'u1'))
      .put('/api/users/u2')
      .send({ name: 'Hijack' });
    expect(res.status).toBe(403);
  });

  it('PUT /:id returns 404 when service signals not-found', async () => {
    (userService.updateUser as any).mockResolvedValueOnce(null);
    const res = await request(mkApp('admin'))
      .put('/api/users/u-ghost')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id deactivates user (admin only)', async () => {
    const res = await request(mkApp()).delete('/api/users/u1');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });

  it('DELETE /:id 403 for non-admin', async () => {
    const res = await request(mkApp('viewer')).delete('/api/users/u1');
    expect(res.status).toBe(403);
  });

  it('DELETE /:id 404 when service signals not-found', async () => {
    (userService.deactivateUser as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).delete('/api/users/ghost');
    expect(res.status).toBe(404);
  });

  it('GET /:id/roles lists assignments', async () => {
    const res = await request(mkApp()).get('/api/users/u1/roles');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /:id/roles assigns role (admin + Zod)', async () => {
    const res = await request(mkApp())
      .post('/api/users/u1/roles')
      .send({ functionalRoleCode: 'admin' });
    expect(res.status).toBe(201);
  });

  it('POST /:id/roles 400 without functionalRoleCode', async () => {
    const res = await request(mkApp()).post('/api/users/u1/roles').send({});
    expect(res.status).toBe(400);
  });

  it('POST /:id/roles 403 for non-admin', async () => {
    const res = await request(mkApp('viewer'))
      .post('/api/users/u1/roles')
      .send({ functionalRoleCode: 'admin' });
    expect(res.status).toBe(403);
  });

  it('DELETE /:id/roles/:roleId revokes', async () => {
    const res = await request(mkApp()).delete('/api/users/u1/roles/a1');
    expect(res.status).toBe(200);
  });

  it('DELETE /:id/roles/:roleId 404 when nothing revoked', async () => {
    (raService.revokeRoleAssignment as any).mockResolvedValueOnce(false);
    const res = await request(mkApp()).delete('/api/users/u1/roles/ghost');
    expect(res.status).toBe(404);
  });
});
