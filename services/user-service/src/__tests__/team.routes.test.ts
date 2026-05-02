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
    teamCreated: vi.fn(), teamMemberAdded: vi.fn(), teamMemberRemoved: vi.fn(),
    raciAssigned: vi.fn(), raciRevoked: vi.fn(), observeDb: vi.fn(),
  },
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireTenantId: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../domain/team.service', () => ({
  listTeams:   vi.fn().mockResolvedValue({ data: [{ team_id: 't1', tenant_id: 't1' }], total: 1 }),
  getTeamById: vi.fn().mockResolvedValue({ team_id: 't1', tenant_id: 't1', name: 'Alpha' }),
  createTeam:  vi.fn().mockResolvedValue({ team_id: 't-new', tenant_id: 't1', name: 'New' }),
  updateTeam:  vi.fn().mockResolvedValue({ team_id: 't1', tenant_id: 't1', name: 'Updated' }),
  deleteTeam:  vi.fn().mockResolvedValue(true),
  listMembers: vi.fn().mockResolvedValue([{ user_id: 'u1' }]),
  addMember:   vi.fn().mockResolvedValue({ member_id: 'm1', team_id: 't1', user_id: 'u2', role: 'member', joined_at: 'now' }),
  removeMember:vi.fn().mockResolvedValue(true),
}));

vi.mock('../domain/raci.service', () => ({
  getRaciByUser: vi.fn().mockResolvedValue({ assignments: [], summary: [] }),
  getRaciByTeam: vi.fn().mockResolvedValue([]),
  assignRaci:    vi.fn().mockResolvedValue({ id: 'r1' }),
  revokeRaci:    vi.fn().mockResolvedValue(true),
}));

import { teamRouter } from '../routes/team.routes';
import * as teamService from '../domain/team.service';
import * as raciService from '../domain/raci.service';

function mkApp(role = 'admin') {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', role, roles: [role] };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/teams', teamRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('team.routes', () => {
  it('GET / lists teams', async () => {
    const res = await request(mkApp()).get('/api/teams');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('GET /:id returns team', async () => {
    const res = await request(mkApp()).get('/api/teams/t1');
    expect(res.status).toBe(200);
    expect(res.body.data.team_id).toBe('t1');
  });

  it('GET /:id 404 when not found', async () => {
    (teamService.getTeamById as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).get('/api/teams/ghost');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEAM_NOT_FOUND');
  });

  it('POST / creates team (admin + Zod)', async () => {
    const res = await request(mkApp())
      .post('/api/teams')
      .send({ name: 'New Team', description: 'desc' });
    expect(res.status).toBe(201);
  });

  it('POST / 400 when name missing', async () => {
    const res = await request(mkApp()).post('/api/teams').send({});
    expect(res.status).toBe(400);
  });

  it('POST / 403 for viewer', async () => {
    const res = await request(mkApp('viewer')).post('/api/teams').send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('PUT /:id updates team', async () => {
    const res = await request(mkApp())
      .put('/api/teams/t1')
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('PUT /:id 404 when team missing', async () => {
    (teamService.updateTeam as any).mockResolvedValueOnce(null);
    const res = await request(mkApp()).put('/api/teams/ghost').send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id soft-deletes', async () => {
    const res = await request(mkApp()).delete('/api/teams/t1');
    expect(res.status).toBe(200);
  });

  it('DELETE /:id 404 when nothing to delete', async () => {
    (teamService.deleteTeam as any).mockResolvedValueOnce(false);
    const res = await request(mkApp()).delete('/api/teams/ghost');
    expect(res.status).toBe(404);
  });

  it('GET /:id/members lists members', async () => {
    const res = await request(mkApp()).get('/api/teams/t1/members');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /:id/members adds (Zod requires userId)', async () => {
    const res = await request(mkApp())
      .post('/api/teams/t1/members')
      .send({ userId: 'u2', roleInTeam: 'member' });
    expect(res.status).toBe(201);
  });

  it('POST /:id/members 400 without userId', async () => {
    const res = await request(mkApp()).post('/api/teams/t1/members').send({});
    expect(res.status).toBe(400);
  });

  it('DELETE /:id/members/:userId', async () => {
    const res = await request(mkApp()).delete('/api/teams/t1/members/u2');
    expect(res.status).toBe(200);
  });

  it('DELETE /:id/members/:userId 404 when not found', async () => {
    (teamService.removeMember as any).mockResolvedValueOnce(false);
    const res = await request(mkApp()).delete('/api/teams/t1/members/ghost');
    expect(res.status).toBe(404);
  });

  it('POST /:id/raci 400 on invalid raciRole', async () => {
    const res = await request(mkApp())
      .post('/api/teams/t1/raci')
      .send({ userId: 'u2', scopeType: 'tenant', raciRole: 'nonsense' });
    expect(res.status).toBe(400);
  });

  it('POST /:id/raci 201 on valid body', async () => {
    const res = await request(mkApp())
      .post('/api/teams/t1/raci')
      .send({ userId: 'u2', scopeType: 'tenant', raciRole: 'responsible' });
    expect(res.status).toBe(201);
  });

  it('GET /raci/by-user/:userId returns shape', async () => {
    const res = await request(mkApp()).get('/api/teams/raci/by-user/u1');
    expect(res.status).toBe(200);
    expect(res.body.assignments).toBeDefined();
    expect(res.body.summary).toBeDefined();
  });

  it('GET /:id/raci returns list', async () => {
    const res = await request(mkApp()).get('/api/teams/t1/raci');
    expect(res.status).toBe(200);
  });

  it('DELETE /raci/:assignmentId', async () => {
    const res = await request(mkApp()).delete('/api/teams/raci/r1');
    expect(res.status).toBe(200);
  });

  it('DELETE /raci/:assignmentId 404 when nothing revoked', async () => {
    (raciService.revokeRaci as any).mockResolvedValueOnce(false);
    const res = await request(mkApp()).delete('/api/teams/raci/ghost');
    expect(res.status).toBe(404);
  });
});
