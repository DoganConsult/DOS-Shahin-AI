/**
 * AI-Governance — top-level mount contract test.
 *
 * Verifies that the 31 FE-contract paths under /api/ai-governance/<slug>
 * are actually mounted in the service.
 *
 * Closes API-WIRE-AUDIT.md §1 (ai-governance — 31 broken).
 */
import { describe, it, expect, vi } from 'vitest';

// ── Stub @dos/auth so authenticate/requireTenantId are no-ops in tests ──
vi.mock('@dos/dauth-shared', () => {
  const passthrough = (req: any, _res: any, next: any) => {
    req.tenantId = 't_test';
    req.user = { id: 'u_test' };
    next();
  };
  return {
    authenticate: passthrough,
    requireTenantId: passthrough,
    requirePermission: () => passthrough,
    requireAnyPermission: () => passthrough,
    requireSuperAdmin: passthrough,
    optionalAuthenticate: passthrough,
  };
});

// ── Stub @dos/db so service calls do not hit a real database ──
vi.mock('@dos/db', () => ({ withTenantClient: vi.fn(async (_t, _u, cb) => cb({ query: vi.fn() })),
  safeQuery: vi.fn(async () => ({ rows: [], rowCount: 0 })),
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn(async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 })),
}));

// ── Stub @dos/types/errors ──
vi.mock('@dos/types/errors', () => ({ toErrorMessage: (e: any) => String(e?.message || e) }));

// ── Stub the Redis event publisher to avoid network ──
vi.mock('../events/publisher', () => ({
  setServiceBus: vi.fn(),
  publishEntityEvent: vi.fn(async () => undefined),
}));

vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn(async () => undefined) }));

import express from 'express';
import request from 'supertest';
import { aiGovernanceTopLevelMounts, routes } from '../routes/index';
import { AI_GOVERNANCE_ENTITY_TYPES } from '../domain/entity-types';

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-governance', routes);
  for (const { path, router } of aiGovernanceTopLevelMounts) {
    app.use(path, router);
  }
  return app;
}

describe('ai-governance-service mounts (31 closures)', () => {
  it('exposes all 31 entity types', () => {
    expect(AI_GOVERNANCE_ENTITY_TYPES.length).toBe(31);
    expect(aiGovernanceTopLevelMounts.length).toBe(31);
  });

  it('aggregator /info reports the service', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/ai-governance/info');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('ai-governance-service');
    expect(res.body.entityTypes).toBe(31);
  });

  it('aggregator /__entity-types lists all 31', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/ai-governance/__entity-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(31);
  });

  // ── 31 FE-contract paths from API-WIRE-AUDIT §1 ──
  for (const def of AI_GOVERNANCE_ENTITY_TYPES) {
    const path = `/api/ai-governance/${def.urlSlug}`;
    it(`GET ${path} returns 200 (mounted)`, async () => {
      const app = buildApp();
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      // Default shape is bare array (matches FE list components).
      expect(Array.isArray(res.body)).toBe(true);
      // Pagination header present
      expect(res.headers['x-total-count']).toBeDefined();
    });
  }

  it('GET /:id returns 404 when not found', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/ai-governance/system-registry/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
