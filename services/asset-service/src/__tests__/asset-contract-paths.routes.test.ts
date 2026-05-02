/**
 * Asset FE-contract path test
 *
 * Verifies the 11 hyphen-form paths that Shahin's
 * frontend/products/shahin-ai/src/app/blueprint/features/asset/services/asset-api.service.ts
 * calls are actually mounted (and not 404 at the service).
 *
 * Closes API-WIRE-AUDIT.md §3 (asset 11 broken FE→BE calls).
 *
 * Strategy: stub each module router with a minimal Express Router that
 * answers `/health` so we exercise mount wiring, not handler internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { Router } from 'express';
import request from 'supertest';

// ─── Stub @dos/service-bootstrap so loadModuleRoute returns a probe Router ──
vi.mock('@dos/service-bootstrap', () => {
  const probe = (label: string): Router => {
    const r = Router();
    r.get('/__probe__', (_req, res) => res.json({ mounted: true, label }));
    r.get('/', (_req, res) => res.json({ mounted: true, label, path: '/' }));
    return r;
  };
  return {
    loadModuleRoute: vi.fn((name: string) => probe(name)),
    modulesDiagnosticRouter: vi.fn(() => probe('modules-diag')),
  };
});

// Avoid pulling the real asset.routes (it imports DB / auth)
vi.mock('../routes/asset.routes', () => {
  const r = Router();
  r.get('/__probe__', (_req, res) => res.json({ mounted: true, label: 'asset-base' }));
  return { default: r };
});

import { assetTopLevelMounts } from '../routes/index';

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  for (const { path, router } of assetTopLevelMounts) {
    app.use(path, router);
  }
  return app;
}

describe('asset FE-contract paths (11 closures)', () => {
  let app: express.Express;
  beforeEach(() => { app = buildApp(); });

  // The 11 hyphen-form paths from API-WIRE-AUDIT §3 / asset-api.service.ts
  const FE_CONTRACT_PATHS = [
    '/api/asset-applications',
    '/api/asset-services',
    '/api/asset-service-map',
    '/api/asset-dependencies',
    '/api/asset-criticality',
    '/api/asset-linkage',
    '/api/asset-classification',
    // Bonus: asset-api.service.ts also uses these — proven mounted
    '/api/asset-ownership',
    '/api/asset-lifecycle',
    '/api/asset-reports',
    '/api/asset-admin',
    '/api/asset-home',
  ];

  for (const p of FE_CONTRACT_PATHS) {
    it(`mounts ${p}/__probe__`, async () => {
      const res = await request(app).get(`${p}/__probe__`);
      expect(res.status).toBe(200);
      expect(res.body.mounted).toBe(true);
    });
  }

  // REST-plural canonical (per API-WIRE-ACTION-PLAN §3)
  const REST_CANONICAL_PATHS = [
    '/api/assets/applications',
    '/api/assets/services',
    '/api/assets/service-map',
    '/api/assets/dependencies',
    '/api/assets/criticality',
    '/api/assets/linkage',
    '/api/assets/classification',
    '/api/assets/ownership',
    '/api/assets/lifecycle',
    '/api/assets/reports',
    '/api/assets/admin',
    '/api/assets/home',
  ];

  for (const p of REST_CANONICAL_PATHS) {
    it(`mounts canonical ${p}/__probe__`, async () => {
      const res = await request(app).get(`${p}/__probe__`);
      expect(res.status).toBe(200);
      expect(res.body.mounted).toBe(true);
    });
  }
});
