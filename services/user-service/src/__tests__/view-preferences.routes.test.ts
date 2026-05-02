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
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: { viewPrefUpsert: vi.fn(), observeDb: vi.fn() },
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireTenantId: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../domain/view-preference.service', () => ({
  listForUser: vi.fn().mockResolvedValue([{ module_code: 'risk', view_key: 'v1', config: {}, is_shared: false, updated_at: 'now' }]),
  getOne:      vi.fn().mockResolvedValue({ module_code: 'risk', view_key: 'v1', config: {}, is_shared: false, updated_at: 'now' }),
  upsert:      vi.fn().mockResolvedValue({ module_code: 'risk', view_key: 'v1', config: { a: 1 }, is_shared: false, updated_at: 'now' }),
  remove:      vi.fn().mockResolvedValue(1),
  listShared:  vi.fn().mockResolvedValue([]),
}));

import viewPreferencesRouter from '../routes/view-preferences.routes';
import * as viewPref from '../domain/view-preference.service';

function mkApp(role = 'user', userId = '11111111-2222-3333-4444-555555555555') {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, role, roles: [role] };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/users', viewPreferencesRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('view-preferences.routes', () => {
  it('GET /me/view-preferences lists prefs', async () => {
    const res = await request(mkApp()).get('/api/users/me/view-preferences');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /me/view-preferences accepts module filter', async () => {
    await request(mkApp()).get('/api/users/me/view-preferences?module=risk');
    expect(viewPref.listForUser).toHaveBeenCalledWith('t1', expect.any(String), 'risk');
  });

  it('GET /me/view-preferences/:module/:view returns 404 when missing', async () => {
    (viewPref.getOne as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).get('/api/users/me/view-preferences/risk/v1');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('VIEW_PREF_NOT_FOUND');
  });

  it('GET /me/view-preferences/:module/:view returns 200 when present', async () => {
    const res = await request(mkApp()).get('/api/users/me/view-preferences/risk/v1');
    expect(res.status).toBe(200);
  });

  it('PUT /me/view-preferences/:module/:view upserts', async () => {
    const res = await request(mkApp())
      .put('/api/users/me/view-preferences/risk/v1')
      .send({ config: { a: 1 } });
    expect(res.status).toBe(200);
    expect(viewPref.upsert).toHaveBeenCalledWith(
      't1', expect.any(String), 'risk', 'v1',
      { config: { a: 1 }, isShared: null },
      { canShare: false },
    );
  });

  it('PUT /me/view-preferences/:module/:view passes canShare=true for admins', async () => {
    await request(mkApp('admin'))
      .put('/api/users/me/view-preferences/risk/v1')
      .send({ config: {}, isShared: true });
    expect(viewPref.upsert).toHaveBeenCalledWith(
      't1', expect.any(String), 'risk', 'v1',
      expect.any(Object),
      { canShare: true },
    );
  });

  it('PUT / 400 when Zod rejects body (wrong type)', async () => {
    const res = await request(mkApp())
      .put('/api/users/me/view-preferences/risk/v1')
      .send({ config: 'not-an-object' });
    expect(res.status).toBe(400);
  });

  it('DELETE /me/view-preferences/:module/:view returns count', async () => {
    const res = await request(mkApp()).delete('/api/users/me/view-preferences/risk/v1');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
  });

  it('GET /view-preferences/shared lists tenant-shared', async () => {
    const res = await request(mkApp()).get('/api/users/view-preferences/shared');
    expect(res.status).toBe(200);
  });
});
