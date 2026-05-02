import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const tenantStatusByTenant: Record<string, string> = { A: 'active', B: 'active', DIS: 'disabled' };
const stateByTenant: Record<string, Record<string, string>> = {
  A: { A01: 'registered', A02: 'registered' },
  B: { A01: 'registered', A02: 'registered' },
  DIS: { A01: 'registered', A02: 'registered' },
};

vi.mock('../../services/tenant-service/src/adapters/auth.adapter', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('SELECT status FROM tenants')) {
      const tenantId = String((params || [])[0] ?? '');
      return { rows: [{ status: tenantStatusByTenant[tenantId] ?? null }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }),
}), { virtual: true });

vi.mock('../../services/tenant-service/src/domain/agents/registry/agent-catalog-bootstrap.service', () => ({
  bootstrapAgentCatalogFromPlatformRegistry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/tenant-service/src/domain/agents/registry/agent-registry.service', () => ({
  warmRegistryCache: vi.fn().mockResolvedValue(undefined),
  ensureTenantAgentStateSeeded: vi.fn().mockResolvedValue(undefined),
  listTenantAgentStates: vi.fn(async (tenantId: string) => stateByTenant[tenantId] ?? {}),
  getAllAgentDefinitions: vi.fn(() => ([
    { agentCode: 'A01', name: 'A01', version: '1.0.0', defaultState: 'registered' },
    { agentCode: 'A02', name: 'A02', version: '1.0.0', defaultState: 'registered' },
  ])),
  getAgentDefinition: vi.fn((agentCode: string) => (agentCode === 'A01' ? { agentCode: 'A01', defaultState: 'registered' } : agentCode === 'A02' ? { agentCode: 'A02', defaultState: 'registered' } : undefined)),
  getAgentState: vi.fn(async (tenantId: string, agentCode: string) => (stateByTenant[tenantId]?.[agentCode] ?? 'registered')),
  setAgentState: vi.fn(async (tenantId: string, agentCode: string, state: string) => {
    stateByTenant[tenantId] = stateByTenant[tenantId] || {};
    stateByTenant[tenantId][agentCode] = state;
  }),
}));

function mkApp(tenantId?: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    if (tenantId) req.tenantId = tenantId;
    req.user = { userId: 'actor' };
    next();
  });
  return app;
}

describe('tenant-service /api/agents', () => {
  beforeEach(() => {
    stateByTenant.A.A01 = 'registered';
    stateByTenant.A.A02 = 'registered';
  });

  it('GET /api/agents requires tenant context', async () => {
    const { default: agentsRouter } = await import('../../services/tenant-service/src/domain/routes/agents.routes');
    const app = mkApp(undefined);
    app.use('/api/agents', agentsRouter);
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/agents/:id/status returns 404 for unknown agent', async () => {
    const { default: agentsRouter } = await import('../../services/tenant-service/src/domain/routes/agents.routes');
    const app = mkApp('A');
    app.use('/api/agents', agentsRouter);
    const res = await request(app).get('/api/agents/A99/status');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('AGENT_NOT_FOUND');
  });

  it('POST /api/agents/:id/enable rejects tenant mismatch', async () => {
    const { default: agentsRouter } = await import('../../services/tenant-service/src/domain/routes/agents.routes');
    const app = mkApp('A');
    app.use('/api/agents', agentsRouter);
    const res = await request(app).post('/api/agents/A01/enable').send({ tenantId: 'B' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TENANT_MISMATCH');
  });

  it('POST /api/agents/:id/enable returns 409 on duplicate enable', async () => {
    const { default: agentsRouter } = await import('../../services/tenant-service/src/domain/routes/agents.routes');
    const app = mkApp('A');
    app.use('/api/agents', agentsRouter);

    const first = await request(app).post('/api/agents/A01/enable').send({});
    expect(first.status).toBe(200);
    expect(first.body.state).toBe('active');

    const second = await request(app).post('/api/agents/A01/enable').send({});
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('AGENT_ALREADY_ACTIVE');
  });

  it('POST /api/agents/:id/enable returns 403 for disabled tenant', async () => {
    const { default: agentsRouter } = await import('../../services/tenant-service/src/domain/routes/agents.routes');
    const app = mkApp('DIS');
    app.use('/api/agents', agentsRouter);
    const res = await request(app).post('/api/agents/A01/enable').send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TENANT_DISABLED');
  });
});

