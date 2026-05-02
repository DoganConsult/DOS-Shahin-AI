import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/dauth-shared', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAnyPermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('@dos/platform-core/resilience/resilient-catch', () => ({
  swallow: (_ec: unknown, p: Promise<unknown>) => p,
  EC: {},
}));

vi.mock('@dos/platform-core/http', () => ({
  auditMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  moduleStack: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  mutationEventHook: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  asyncHandler:
    (fn: (req: unknown, res: unknown, next: (e?: unknown) => void) => Promise<unknown>) =>
    (req: unknown, res: unknown, next: (e?: unknown) => void) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  validate: (schemaMap: any) => (req: any, res: any, next: () => void) => {
    const strict = Boolean(schemaMap?.strict);
    for (const src of ['body', 'query', 'params'] as const) {
      const schema = schemaMap?.[src];
      if (!schema) continue;
      const r = strict && typeof schema.strict === 'function'
        ? schema.strict().safeParse(req[src])
        : schema.safeParse(req[src]);
      if (!r.success) {
        res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR' });
        return;
      }
      req[src] = r.data;
    }
    next();
  },
  setAuditData: vi.fn(),
}));

vi.mock('../../../ai-governance/services/ai/registry/ai-asset-inventory.service', () => ({
  listAssets: vi.fn().mockResolvedValue({ assets: [], total: 0 }),
}));

const svc = vi.hoisted(() => ({
  createDraftAgentVersion: vi.fn(),
  updateDraftAgentVersion: vi.fn(),
  submitAgentVersionForApproval: vi.fn(),
  approveAgentVersion: vi.fn(),
  rejectAgentVersion: vi.fn(),
  activateAgentVersion: vi.fn(),
  suspendAgentVersion: vi.fn(),
  retireAgentVersion: vi.fn(),
  rollbackAgentVersion: vi.fn(),
  listAgentVersions: vi.fn().mockResolvedValue({ versions: [], total: 0 }),
  getAgentVersionById: vi.fn().mockResolvedValue(null),
  getActiveAgentVersionForAsset: vi.fn().mockResolvedValue(null),
  deleteAgentVersion: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../services/agents/core/agent-registry.service', () => svc);

vi.mock('@dos/module-sdk', () => ({
  toErrorMessage: (e: any) => String(e?.message ?? e),
}));

import router from './agent-registry.routes';

function mkApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).tenantId = 't1';
    (req as any).user = { userId: 'u1' };
    (req as any).userId = 'u1';
    next();
  });
  app.use('/', router);
  app.use((err: any, _req: unknown, res: express.Response, _next: express.NextFunction) => {
    res.status(err?.status ?? 500).json({ error: err?.message, code: err?.code });
  });
  return app;
}

describe('agent-registry.routes validation', () => {
  it('POST /versions returns 400 for missing fields', async () => {
    const res = await request(mkApp()).post('/versions').send({ asset_id: 'a1' });
    expect(res.status).toBe(400);
  });

  it('POST /versions accepts required fields', async () => {
    svc.createDraftAgentVersion.mockResolvedValueOnce({ agent_version_id: 'v1' });
    const res = await request(mkApp()).post('/versions').send({ asset_id: 'a1', agent_config: { x: 1 } });
    expect(res.status).toBe(201);
  });

  it('POST /versions/:assetId/rollback requires target_version_id', async () => {
    const res = await request(mkApp()).post('/versions/a1/rollback').send({});
    expect(res.status).toBe(400);
  });
});
