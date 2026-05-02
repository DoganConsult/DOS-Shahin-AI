import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Wire-closure regression guard.
//
// The compliance-controls-service gateway surface includes seven FE-called
// endpoints that were flagged by docs/API-WIRE-AUDIT.md as broken wires:
//
//   1. GET  /api/compliance-assertions         (module route)
//   2. GET  /api/ksa-regulatory-changes        (module route)
//   3. GET  /api/nca-assessment                (module route)
//   4. GET  /api/assessment-templates          (service route)
//   5. GET  /api/controls/:id/process-cycle    (module route, mergeParams)
//   6. GET  /api/exceptions                    (module route)
//   7. GET  /api/documents/:id/elements        (service route, new)
//
// This test asserts every endpoint resolves to a real handler (not a
// silent 404 from an empty fallback router) by:
//   - requiring the compiled module dist via loadModuleRoute (same path
//     the service uses in production)
//   - mounting each router into an express app at the exact prefix the
//     service declares in server.ts
//   - probing a canonical request per endpoint and asserting the status
//     is anything but 404, and that the load-results table recorded a
//     successful load for each module route.
//
// The goal is to fail CI whenever someone removes a mount, a module
// dist path drifts, or a module stops exporting a Router.

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: (t: string) => `tenant_${t}`,
  withTenantClient: vi.fn(async (_t: string, _u: string, cb: any) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  tenantScopedQuery: vi.fn().mockResolvedValue({ rows: [] }),
  assertTenantId: vi.fn(),
}));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../adapters/auth.adapter', () => ({
  authenticate: vi.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'u1@t.co', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    req.tenantId = 't1';
    next();
  }),
  requireTenantId: vi.fn((req: any, _res: any, next: any) => {
    req.tenantId = req.tenantId || 't1';
    next();
  }),
  requirePermission: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

interface Probe {
  label: string;
  mount: string;
  probePath: string;
  moduleName?: string;
}

const PROBES: Probe[] = [
  { label: '/api/compliance-assertions', mount: '/api/compliance-assertions', probePath: '/api/compliance-assertions/', moduleName: 'compliance/compliance/compliance-assertions' },
  { label: '/api/ksa-regulatory-changes', mount: '/api/ksa-regulatory-changes', probePath: '/api/ksa-regulatory-changes/', moduleName: 'compliance/ksa/ksa-regulatory-changes' },
  { label: '/api/nca-assessment', mount: '/api/nca-assessment', probePath: '/api/nca-assessment/', moduleName: 'compliance/misc/assessment/nca-assessment' },
  { label: '/api/assessment-templates', mount: '/api/assessment-templates', probePath: '/api/assessment-templates/' },
  { label: '/api/controls/:id/process-cycle', mount: '/api/controls/:id/process-cycle', probePath: `/api/controls/${VALID_UUID}/process-cycle/`, moduleName: 'compliance/misc/controls/control-process-cycle' },
  { label: '/api/exceptions', mount: '/api/exceptions', probePath: '/api/exceptions/', moduleName: 'exception/exception' },
  { label: '/api/documents/:id/elements', mount: '/api/documents', probePath: `/api/documents/${VALID_UUID}/elements` },
];

describe('wire-closure (7 endpoints)', () => {
  let app: express.Express;
  let loadSummary: { loaded: number; failed: number; modules: Array<{ name: string; loaded: boolean; error?: string }> };

  beforeAll(async () => {
    const { loadModuleRoute, getModuleLoadResults } = await import('@dos/service-bootstrap');

    const complianceAssertionsRouter = loadModuleRoute(
      'compliance/compliance/compliance-assertions',
      '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-assertions.routes',
    );
    const ksaRegulatoryChangesRouter = loadModuleRoute(
      'compliance/ksa/ksa-regulatory-changes',
      '../../../modules/compliance/dist/backend/compliance/routes/ksa/ksa-regulatory-changes.routes',
    );
    const ncaAssessmentRouter = loadModuleRoute(
      'compliance/misc/assessment/nca-assessment',
      '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/nca-assessment.routes',
    );
    const controlProcessCycleRouter = loadModuleRoute(
      'compliance/misc/controls/control-process-cycle',
      '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/control-process-cycle.routes',
    );
    const exceptionRouter = loadModuleRoute(
      'exception/exception',
      '../../../modules/exception/dist/backend/exception/routes/exception.routes',
    );
    const { default: assessmentTemplatesRouter } = await import('../routes/assessment-templates.routes');
    const { default: documentsRouter } = await import('../routes/documents.routes');

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u1', email: 'u1@t.co', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
      req.tenantId = 't1';
      req.headers['x-tenant-id'] = 't1';
      req.headers['authorization'] = 'Bearer test-token';
      next();
    });

    app.use('/api/compliance-assertions', complianceAssertionsRouter);
    app.use('/api/ksa-regulatory-changes', ksaRegulatoryChangesRouter);
    app.use('/api/nca-assessment', ncaAssessmentRouter);
    app.use('/api/assessment-templates', assessmentTemplatesRouter);
    app.use('/api/controls/:id/process-cycle', controlProcessCycleRouter);
    app.use('/api/exceptions', exceptionRouter);
    app.use('/api/documents', documentsRouter);

    loadSummary = getModuleLoadResults();
  });

  it('loads every required module router from the compiled dist', () => {
    const byName = new Map(loadSummary.modules.map((m) => [m.name, m]));
    const required = PROBES.filter((p) => p.moduleName).map((p) => p.moduleName!);
    const missing = required.filter((n) => !byName.get(n)?.loaded);
    expect(missing, `these module routers failed to load: ${missing.join(', ')}`).toEqual([]);
  });

  for (const probe of PROBES) {
    it(`mounts ${probe.label} so it does not 404`, async () => {
      const res = await request(app).get(probe.probePath);
      // A non-404 status proves the mount resolves to a real handler.
      // 200, 400, 401, 403, 500 are all acceptable for this smoke test —
      // the contract tested here is "a route matched", not "the handler
      // succeeded against empty mocks".
      expect(res.status, `${probe.label} -> ${res.status}`).not.toBe(404);
    });
  }
});
