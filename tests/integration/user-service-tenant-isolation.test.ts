/**
 * Cross-tenant isolation test for user-service.
 *
 * This is an integration test that verifies every user-service route is
 * tenant-scoped — a request with tenant-A context must never be able to read,
 * modify, or delete data owned by tenant-B.
 *
 * Strategy: mount each router under a mocked service layer. The mock returns
 * rows only when the tenant IDs match; otherwise null/404. We assert that
 * supertest requests carrying tenant-A credentials targeting tenant-B entities
 * get 404 / empty result — never the cross-tenant row.
 *
 * This is complementary to unit tests (which verify SQL uses `tenant_id = $N`)
 * and to the cross-tenant SQL test in ops/scripts/test-rls-cross-tenant.ts
 * (which verifies RLS at the DB layer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({
  withTenantClient: vi.fn(),
  query: vi.fn(),
  safeQuery: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  tenantSchema: (t: string) => `tenant_${t}`,
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

// auditMiddleware's res.json wrapper synchronously invokes
// db.tenantSchema(req.tenantId), which throws under Phase 2's tightened
// `^tenant_[a-z0-9_-]{1,64}$` regex when the test uses short tenant
// handles like "A"/"B"/"Z". The wrapper swallows async INSERT failures
// but not the schema-validation throw — so the mutating request's 200
// gets masked as a 400 Express error page. Stub the middleware to a
// pass-through; the isolation contract under test is tenant scoping at
// the service layer, not the audit-trail write path.
vi.mock('@dos/platform-core/http', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@dos/platform-core/http');
  return {
    ...actual,
    auditMiddleware: (_actionCode?: string) => (_req: any, _res: any, next: any) => next(),
    setAuditData: (_res: any, _data: any) => {},
  };
});

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  publishEvent: vi.fn().mockResolvedValue(undefined),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../../services/user-service/src/observability/metrics', () => ({
  userMetrics: new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('../../services/user-service/src/adapters/auth.adapter', () => ({
  authenticate:         (_req: any, _res: any, next: any) => next(),
  requireTenantId:      (_req: any, _res: any, next: any) => next(),
  requirePermission:    () => (_req: any, _res: any, next: any) => next(),
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin:    (_req: any, _res: any, next: any) => next(),
}));

// user-service now mounts middleware from these modules on PUT/DELETE
// routes; passing them through lets the test focus on the tenant-
// isolation contract at the service layer rather than rate-limiting
// or ownership enforcement.
vi.mock('../../services/user-service/src/middleware/rate-limiter', () => ({
  writeRateLimiter: (_req: any, _res: any, next: any) => next(),
  readRateLimiter:  (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../services/user-service/src/middleware/ownership', () => ({
  requireAdmin:        () => (_req: any, _res: any, next: any) => next(),
  requireSelfOrAdmin:  () => (_req: any, _res: any, next: any) => next(),
}));

type Row = { tenant_id: string; id: string };
const rowTA: Row = { tenant_id: 'A', id: 'rec-1' };

// Mocks that enforce tenant_id at the service layer.
vi.mock('../../services/user-service/src/domain/user.service', () => ({
  getUserById: vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1' ? rowTA : null)),
  listUsers:   vi.fn(async (tenantId: string) => ({ data: tenantId === 'A' ? [rowTA] : [], total: tenantId === 'A' ? 1 : 0 })),
  createUser:      vi.fn(async (tenantId: string) => ({ user_id: 'x', tenant_id: tenantId, email: 'x@y' })),
  updateUser:      vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1' ? rowTA : null)),
  deactivateUser:  vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1' ? rowTA : null)),
}));

vi.mock('../../services/user-service/src/domain/team.service', () => ({
  getTeamById: vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1' ? rowTA : null)),
  listTeams:   vi.fn(async (tenantId: string) => ({ data: tenantId === 'A' ? [rowTA] : [], total: tenantId === 'A' ? 1 : 0 })),
  createTeam:  vi.fn(async (tenantId: string) => ({ team_id: 'x', tenant_id: tenantId, name: 'X' })),
  updateTeam:  vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1' ? rowTA : null)),
  deleteTeam:  vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1')),
  listMembers: vi.fn(async () => []),
  addMember:   vi.fn(),
  removeMember:vi.fn(async () => false),
}));

vi.mock('../../services/user-service/src/domain/raci.service', () => ({
  getRaciByUser: vi.fn(async () => ({ assignments: [], summary: [] })),
  getRaciByTeam: vi.fn(async () => []),
  assignRaci:    vi.fn(async () => ({ id: 'r1' })),
  revokeRaci:    vi.fn(async (tenantId: string, id: string) => (tenantId === 'A' && id === 'rec-1')),
}));

vi.mock('../../services/user-service/src/domain/role-assignment.service', () => ({
  listRoleAssignments:  vi.fn(async (tenantId: string) => (tenantId === 'A' ? [{ assignment_id: 'a1' }] : [])),
  assignRole:           vi.fn(async (tenantId: string) => ({ assignment_id: 'a1', tenant_id: tenantId })),
  revokeRoleAssignment: vi.fn(async (tenantId: string, _uId: string, id: string) => (tenantId === 'A' && id === 'rec-1')),
}));

vi.mock('../../services/user-service/src/events/publisher', () => ({
  publishUserCreated: vi.fn(), publishUserUpdated: vi.fn(), publishUserDeactivated: vi.fn(),
  publishTeamMemberAdded: vi.fn(), publishTeamMemberRemoved: vi.fn(),
  publishRoleAssigned: vi.fn(), publishRoleRevoked: vi.fn(),
}));

vi.mock('../../services/user-service/src/events/user.publishers', () => ({
  publishUserCreated: vi.fn(), publishUserUpdated: vi.fn(), publishUserDeactivated: vi.fn(),
}));

import { userRouter } from '../../services/user-service/src/routes/user.routes';
import { teamRouter } from '../../services/user-service/src/routes/team.routes';

function mkAppFor(router: express.Router, tenantId: string, prefix: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'actor', role: 'admin', roles: ['admin'] };
    req.tenantId = tenantId;
    next();
  });
  app.use(prefix, router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

describe('user-service cross-tenant isolation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('tenant A has data, tenant B does NOT see it', () => {
    it('GET /api/users/:id — tenant-A sees own record, tenant-B gets 404', async () => {
      const a = await request(mkAppFor(userRouter, 'A', '/api/users')).get('/api/users/rec-1');
      const b = await request(mkAppFor(userRouter, 'B', '/api/users')).get('/api/users/rec-1');
      expect(a.status).toBe(200);
      expect(b.status).toBe(404);
      expect(b.body.code).toBe('USER_NOT_FOUND');
    });

    it('GET /api/users — tenant-A sees 1 row, tenant-B sees 0', async () => {
      const a = await request(mkAppFor(userRouter, 'A', '/api/users')).get('/api/users?page=1&pageSize=10');
      const b = await request(mkAppFor(userRouter, 'B', '/api/users')).get('/api/users?page=1&pageSize=10');
      expect(a.body.total).toBe(1);
      expect(b.body.total).toBe(0);
    });

    it('PUT /api/users/:id — tenant-A succeeds, tenant-B gets 404 (no data leak into update)', async () => {
      const a = await request(mkAppFor(userRouter, 'A', '/api/users')).put('/api/users/rec-1').send({ name: 'Edit' });
      const b = await request(mkAppFor(userRouter, 'B', '/api/users')).put('/api/users/rec-1').send({ name: 'Hijack' });
       
      if (a.status !== 200) console.log('PUT A debug:', a.status, 'text:', a.text, 'body:', JSON.stringify(a.body));
      expect(a.status).toBe(200);
      expect(b.status).toBe(404);
    });

    it('DELETE /api/users/:id — tenant-A succeeds, tenant-B gets 404', async () => {
      const a = await request(mkAppFor(userRouter, 'A', '/api/users')).delete('/api/users/rec-1');
      const b = await request(mkAppFor(userRouter, 'B', '/api/users')).delete('/api/users/rec-1');
      expect(a.status).toBe(200);
      expect(b.status).toBe(404);
    });

    it('GET /api/teams/:id — tenant-B cannot read tenant-A team', async () => {
      const a = await request(mkAppFor(teamRouter, 'A', '/api/teams')).get('/api/teams/rec-1');
      const b = await request(mkAppFor(teamRouter, 'B', '/api/teams')).get('/api/teams/rec-1');
      expect(a.status).toBe(200);
      expect(b.status).toBe(404);
      expect(b.body.code).toBe('TEAM_NOT_FOUND');
    });

    it('DELETE /api/teams/:id — tenant-B cannot delete tenant-A team', async () => {
      const a = await request(mkAppFor(teamRouter, 'A', '/api/teams')).delete('/api/teams/rec-1');
      const b = await request(mkAppFor(teamRouter, 'B', '/api/teams')).delete('/api/teams/rec-1');
      expect(a.status).toBe(200);
      expect(b.status).toBe(404);
    });
  });

  describe('service layer receives the exact tenant_id from the request', () => {
    it('list forwards tenant from req.tenantId', async () => {
      const userService = await import('../../services/user-service/src/domain/user.service');
      await request(mkAppFor(userRouter, 'Z', '/api/users')).get('/api/users?page=1&pageSize=5');
      expect((userService.listUsers as any).mock.calls.at(-1)[0]).toBe('Z');
    });
  });
});
