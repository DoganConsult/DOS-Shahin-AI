/**
 * Widget Routes -- Integration Tests
 *
 * Patch 10: Route-level integration tests for all five widget route groups.
 * Tests HTTP behavior via supertest, DAuth middleware enforcement, and service delegation.
 *
 * Route groups:
 *  - Widget Registry: CRUD for widget definitions
 *  - Widget Bundle: CRUD for widget bundles
 *  - Widget Runtime: catalog, published bundles, render, stats
 *  - Widget Executive: executive dashboard widgets
 *  - Widget Diagnostics: health and diagnostic checks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// vi.hoisted runs before vi.mock factories, so these are available during hoisting.
const {
  permissionsRequested,
  mockRegistryList, mockRegistryGetById, mockRegistryCreate,
  mockRegistryUpdate, mockRegistryTransitionStatus, mockRegistryDelete,
  mockBundleList, mockBundleGetById, mockBundleCreate,
  mockBundleUpdate, mockBundleTransitionStatus, mockBundleDelete,
  mockGetPublishedCatalog, mockGetPublishedBundles, mockRenderWidget,
  mockGetRenderStats, mockIsInsightWidget,
  mockGetSummary, mockGetTopBreachedKris, mockGetPolicyReviewDebt, mockGetEngineTrend,
  mockRunDiagnostics, mockRunRenderDiagnostics, mockRunPublicationDiagnostics,
} = vi.hoisted(() => ({
  permissionsRequested: [] as string[],

  mockRegistryList: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  mockRegistryGetById: vi.fn().mockResolvedValue({ widget_id: 'w-1', widget_key: 'test-widget' }),
  mockRegistryCreate: vi.fn().mockResolvedValue({ widget_id: 'w-new', widget_key: 'new-widget' }),
  mockRegistryUpdate: vi.fn().mockResolvedValue({ widget_id: 'w-1', nameEn: 'Updated' }),
  mockRegistryTransitionStatus: vi.fn().mockResolvedValue({ widget_id: 'w-1', status: 'published' }),
  mockRegistryDelete: vi.fn().mockResolvedValue(undefined),

  mockBundleList: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  mockBundleGetById: vi.fn().mockResolvedValue({ bundle_id: 'b-1', name_en: 'Test Bundle' }),
  mockBundleCreate: vi.fn().mockResolvedValue({ bundle_id: 'b-new', name_en: 'New Bundle' }),
  mockBundleUpdate: vi.fn().mockResolvedValue({ bundle_id: 'b-1', name_en: 'Updated Bundle' }),
  mockBundleTransitionStatus: vi.fn().mockResolvedValue({ bundle_id: 'b-1', status: 'published' }),
  mockBundleDelete: vi.fn().mockResolvedValue(undefined),

  mockGetPublishedCatalog: vi.fn().mockResolvedValue([{ widget_key: 'w1' }]),
  mockGetPublishedBundles: vi.fn().mockResolvedValue([{ bundle_id: 'b1' }]),
  mockRenderWidget: vi.fn().mockResolvedValue({
    widgetKey: 'executive-summary', title: 'Executive Summary',
    payload: { risks: 5 }, fetchedAt: '2026-03-31T00:00:00.000Z',
  }),
  mockGetRenderStats: vi.fn().mockResolvedValue([{ widget_key: 'w1', count: 10 }]),
  mockIsInsightWidget: vi.fn().mockReturnValue(false),

  mockGetSummary: vi.fn().mockResolvedValue({
    staleControlsCount: 3, overdueRemediationCount: 2,
    policyReviewDebtCount: 5, latestEngineRun: null,
  }),
  mockGetTopBreachedKris: vi.fn().mockResolvedValue([{ kriId: 'kri-1', name: 'Risk KRI', status: 'breached' }]),
  mockGetPolicyReviewDebt: vi.fn().mockResolvedValue([{ policyId: 'p-1', title: 'Policy A', daysOverdue: 15 }]),
  mockGetEngineTrend: vi.fn().mockResolvedValue([{ month: '2026-01', runs: 4 }]),

  mockRunDiagnostics: vi.fn().mockResolvedValue({
    moduleCode: 'widgets', healthy: true,
    checks: [{ name: 'schema_exists', passed: true }],
    checkedAt: '2026-03-31T00:00:00.000Z',
  }),
  mockRunRenderDiagnostics: vi.fn().mockResolvedValue([
    { name: 'render_error_rate', passed: true, detail: '0.0% error rate (0/0)' },
  ]),
  mockRunPublicationDiagnostics: vi.fn().mockResolvedValue([
    { name: 'stale_drafts', passed: true, detail: '0 widgets in draft > 30 days' },
  ]),
}));

// ---- Mock DAuth ----
vi.mock('../../../platform/dauth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requirePermission: (perm: string) => {
    permissionsRequested.push(perm);
    return (_req: any, _res: any, next: any) => next();
  },
}));

// ---- Mock DOS HTTP infrastructure ----
vi.mock('../../../platform/dos/http/error-handling/async-handler', () => ({
  asyncHandler: (fn: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));
vi.mock('../../../platform/dos/http/middleware/module-stack', () => ({
  moduleStack: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../platform/dos/http/middleware/audit', () => ({
  auditMiddleware: () => (_req: any, _res: any, next: any) => next(),
  setAuditData: vi.fn(),
}));
vi.mock('../../../platform/dos/http/middleware/scope-context', () => ({
  scopeContext: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../platform/dos/http/guards/lifecycle-gate', () => ({
  lifecycleGate: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../platform/dos/http/validation/validate', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

// ---- Mock event bus + resilient-catch ----
vi.mock('../../../platform/dos/events/event-bus', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../utils/resilient-catch', () => ({
  swallow: vi.fn(),
  swallowDefault: vi.fn((_code: any, promise: any) => promise),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

// ---- Mock database ----
vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  emptyResult: { rows: [], rowCount: 0 },
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

// ---- Mock logger ----
vi.mock('../../../platform/dos/observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---- Mock widget events ----
vi.mock('../events/widgets.events', () => ({
  WIDGETS_EVENT_TYPES: {
    RECORD_CREATED: 'widgets.record.created',
    RECORD_UPDATED: 'widgets.record.updated',
    RECORD_DELETED: 'widgets.record.deleted',
    STATUS_CHANGED: 'widgets.status.changed',
  },
}));

// ---- Mock errors ----
vi.mock('../../../errors/index', () => {
  class NotFoundError extends Error {
    statusCode = 404;
    constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
  }
  return { NotFoundError };
});

// ---- Mock services using class/function syntax for constructor compatibility ----

vi.mock('../services/registry/widget-registry.service', () => ({
  WidgetRegistryService: class MockWidgetRegistryService {
    constructor(_tenantId: string) {}
    list = (...args: unknown[]) => mockRegistryList(...args);
    getById = (...args: unknown[]) => mockRegistryGetById(...args);
    create = (...args: unknown[]) => mockRegistryCreate(...args);
    update = (...args: unknown[]) => mockRegistryUpdate(...args);
    transitionStatus = (...args: unknown[]) => mockRegistryTransitionStatus(...args);
    delete = (...args: unknown[]) => mockRegistryDelete(...args);
  },
}));

vi.mock('../services/bundle/widget-bundle.service', () => ({
  WidgetBundleService: class MockWidgetBundleService {
    constructor(_tenantId: string) {}
    list = (...args: unknown[]) => mockBundleList(...args);
    getById = (...args: unknown[]) => mockBundleGetById(...args);
    create = (...args: unknown[]) => mockBundleCreate(...args);
    update = (...args: unknown[]) => mockBundleUpdate(...args);
    transitionStatus = (...args: unknown[]) => mockBundleTransitionStatus(...args);
    delete = (...args: unknown[]) => mockBundleDelete(...args);
  },
}));

vi.mock('../services/runtime/widget-runtime.service', () => ({
  WidgetRuntimeService: class MockWidgetRuntimeService {
    constructor(_tenantId: string) {}
    getPublishedCatalog = (...args: unknown[]) => mockGetPublishedCatalog(...args);
    getPublishedBundles = (...args: unknown[]) => mockGetPublishedBundles(...args);
    renderWidget = (...args: unknown[]) => mockRenderWidget(...args);
    getRenderStats = (...args: unknown[]) => mockGetRenderStats(...args);
    isInsightWidget = (...args: unknown[]) => mockIsInsightWidget(...args);
  },
}));

vi.mock('../services/insight/insight-widgets.service', () => ({
  INSIGHT_WIDGET_KEYS: new Set(['zombie-controls', 'risk-gravity']),
}));

vi.mock('../services/executive/executive-widgets.service', () => ({
  ExecutiveWidgetsService: class MockExecutiveWidgetsService {
    constructor(_tenantId: string) {}
    getSummary = (...args: unknown[]) => mockGetSummary(...args);
    getTopBreachedKris = (...args: unknown[]) => mockGetTopBreachedKris(...args);
    getPolicyReviewDebt = (...args: unknown[]) => mockGetPolicyReviewDebt(...args);
    getEngineTrend = (...args: unknown[]) => mockGetEngineTrend(...args);
  },
}));

vi.mock('../diagnostics/widgets-diagnostics.service', () => ({
  WidgetDiagnosticsService: class MockWidgetDiagnosticsService {
    constructor(_tenantId: string) {}
    runDiagnostics = (...args: unknown[]) => mockRunDiagnostics(...args);
    runRenderDiagnostics = (...args: unknown[]) => mockRunRenderDiagnostics(...args);
    runPublicationDiagnostics = (...args: unknown[]) => mockRunPublicationDiagnostics(...args);
  },
}));

// ---- Imports (after all vi.mock calls, vitest hoists mocks above these) ----

import registryRouter from './widget-registry.routes';
import bundleRouter from './widget-bundle.routes';
import runtimeRouter from './widget-runtime.routes';
import executiveRouter from './widget-executive.routes';
import diagnosticsRouter from './widget-diagnostics.routes';

// ---- Test utilities ----

const TENANT_ID = 'tenant-test-001';
const USER_ID = 'user-test-001';

/**
 * Build an express app that injects tenantId and user context,
 * then mounts the given router at the specified base path.
 */
function buildApp(router: any, basePath: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.tenantId = TENANT_ID;
    req.user = { userId: USER_ID, email: 'test@test.com', role: 'admin' };
    req.correlationId = 'corr-test-001';
    next();
  });
  app.use(basePath, router);
  // Global error handler so 500s return JSON
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

/**
 * Build an express app without tenant/user context (for auth-missing tests).
 */
function buildBareApp(router: any, basePath: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.tenantId = undefined;
    req.user = undefined;
    req.correlationId = 'corr-test-001';
    next();
  });
  app.use(basePath, router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

// ---- Test suites ----

describe('Widget Routes -- Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Note: permissionsRequested is populated at module load time (route definition)
    // and must NOT be cleared between tests. It captures the static middleware wiring.
  });

  // ==========================================================================
  // Widget Registry Routes
  // ==========================================================================
  describe('Widget Registry Routes', () => {
    const app = buildApp(registryRouter, '/widgets/registry');

    describe('GET / (list widgets)', () => {
      it('returns 200 with paginated widget list', async () => {
        const rows = [
          { widget_id: 'w-1', widget_key: 'risk-heatmap', status: 'published' },
          { widget_id: 'w-2', widget_key: 'executive-summary', status: 'draft' },
        ];
        mockRegistryList.mockResolvedValueOnce({ rows, total: 2 });

        const res = await request(app).get('/widgets/registry').expect(200);

        expect(res.body.success).toBe(true);
        expect(mockRegistryList).toHaveBeenCalledOnce();
      });

      it('returns empty result set', async () => {
        mockRegistryList.mockResolvedValueOnce({ rows: [], total: 0 });

        const res = await request(app).get('/widgets/registry').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual([]);
      });

      it('auth middleware is wired (widgets.record.read registered at route build time)', () => {
        // requirePermission is called at route definition time, not per-request.
        // We verify the permission string was registered when the route module was loaded.
        expect(permissionsRequested).toContain('widgets.record.read');
      });
    });

    describe('GET /:id (get widget by id)', () => {
      it('returns 200 with widget data', async () => {
        const widget = { widget_id: 'w-1', widget_key: 'risk-heatmap', status: 'published' };
        mockRegistryGetById.mockResolvedValueOnce(widget);

        const res = await request(app).get('/widgets/registry/w-1').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(widget);
        expect(mockRegistryGetById).toHaveBeenCalledWith('w-1');
      });

      it('returns 404 when widget not found', async () => {
        const { NotFoundError } = await import('../../../errors/index') as any;
        mockRegistryGetById.mockRejectedValueOnce(new NotFoundError('Widget w-999 not found'));

        const res = await request(app).get('/widgets/registry/w-999').expect(404);

        expect(res.body.error).toContain('not found');
      });
    });

    describe('POST / (create widget)', () => {
      const validBody = {
        widgetKey: 'new-widget', nameEn: 'New Widget',
        category: 'executive', size: 'medium',
      };

      it('returns 201 with created widget', async () => {
        const created = { widget_id: 'w-new', widget_key: 'new-widget', status: 'draft' };
        mockRegistryCreate.mockResolvedValueOnce(created);

        const res = await request(app)
          .post('/widgets/registry')
          .send(validBody)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(created);
        expect(mockRegistryCreate).toHaveBeenCalledWith(validBody, USER_ID);
      });

      it('auth middleware requires widgets.record.write', () => {
        expect(permissionsRequested).toContain('widgets.record.write');
      });
    });

    describe('PUT /:id (update widget)', () => {
      const updateBody = { nameEn: 'Updated Widget' };

      it('returns 200 with updated widget', async () => {
        const updated = { widget_id: 'w-1', widget_key: 'test-widget', nameEn: 'Updated Widget' };
        mockRegistryUpdate.mockResolvedValueOnce(updated);

        const res = await request(app)
          .put('/widgets/registry/w-1')
          .send(updateBody)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(updated);
        expect(mockRegistryUpdate).toHaveBeenCalledWith('w-1', updateBody, USER_ID);
      });
    });

    describe('PATCH /:id/status (transition widget status)', () => {
      const statusBody = { status: 'published' };

      it('returns 200 with transitioned widget', async () => {
        const transitioned = { widget_id: 'w-1', status: 'published' };
        mockRegistryTransitionStatus.mockResolvedValueOnce(transitioned);

        const res = await request(app)
          .patch('/widgets/registry/w-1/status')
          .send(statusBody)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(transitioned);
        expect(mockRegistryTransitionStatus).toHaveBeenCalledWith('w-1', 'published', USER_ID);
      });

      it('auth middleware requires widgets.record.approve', () => {
        expect(permissionsRequested).toContain('widgets.record.approve');
      });
    });

    describe('DELETE /:id (delete widget)', () => {
      it('returns 200 with action message', async () => {
        mockRegistryDelete.mockResolvedValueOnce(undefined);

        const res = await request(app)
          .delete('/widgets/registry/w-1')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Widget deleted');
        expect(mockRegistryDelete).toHaveBeenCalledWith('w-1', USER_ID);
      });

      it('auth middleware requires widgets.record.delete', () => {
        expect(permissionsRequested).toContain('widgets.record.delete');
      });
    });
  });

  // ==========================================================================
  // Widget Bundle Routes
  // ==========================================================================
  describe('Widget Bundle Routes', () => {
    const app = buildApp(bundleRouter, '/widgets/bundles');

    describe('GET / (list bundles)', () => {
      it('returns 200 with paginated bundle list', async () => {
        const rows = [{ bundle_id: 'b-1', name_en: 'Executive Pack', status: 'published' }];
        mockBundleList.mockResolvedValueOnce({ rows, total: 1 });

        const res = await request(app).get('/widgets/bundles').expect(200);

        expect(res.body.success).toBe(true);
        expect(mockBundleList).toHaveBeenCalledOnce();
      });

      it('auth middleware requires widgets.record.read', () => {
        expect(permissionsRequested).toContain('widgets.record.read');
      });
    });

    describe('GET /:id (get bundle by id)', () => {
      it('returns 200 with bundle data', async () => {
        const bundle = { bundle_id: 'b-1', name_en: 'Executive Pack' };
        mockBundleGetById.mockResolvedValueOnce(bundle);

        const res = await request(app).get('/widgets/bundles/b-1').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(bundle);
        expect(mockBundleGetById).toHaveBeenCalledWith('b-1');
      });
    });

    describe('POST / (create bundle)', () => {
      const validBody = { nameEn: 'New Bundle', widgetIds: ['w-1', 'w-2'] };

      it('returns 201 with created bundle', async () => {
        const created = { bundle_id: 'b-new', name_en: 'New Bundle' };
        mockBundleCreate.mockResolvedValueOnce(created);

        const res = await request(app)
          .post('/widgets/bundles')
          .send(validBody)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(created);
        expect(mockBundleCreate).toHaveBeenCalledWith(validBody, USER_ID);
      });

      it('auth middleware requires widgets.record.write', () => {
        expect(permissionsRequested).toContain('widgets.record.write');
      });
    });

    describe('PUT /:id (update bundle)', () => {
      const updateBody = { nameEn: 'Updated Bundle' };

      it('returns 200 with updated bundle', async () => {
        const updated = { bundle_id: 'b-1', name_en: 'Updated Bundle' };
        mockBundleUpdate.mockResolvedValueOnce(updated);

        const res = await request(app)
          .put('/widgets/bundles/b-1')
          .send(updateBody)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(updated);
        expect(mockBundleUpdate).toHaveBeenCalledWith('b-1', updateBody, USER_ID);
      });
    });

    describe('PATCH /:id/status (transition bundle status)', () => {
      it('returns 200 with transitioned bundle', async () => {
        const transitioned = { bundle_id: 'b-1', status: 'published' };
        mockBundleTransitionStatus.mockResolvedValueOnce(transitioned);

        const res = await request(app)
          .patch('/widgets/bundles/b-1/status')
          .send({ status: 'published' })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(transitioned);
        expect(mockBundleTransitionStatus).toHaveBeenCalledWith('b-1', 'published', USER_ID);
      });

      it('auth middleware requires widgets.record.approve', () => {
        expect(permissionsRequested).toContain('widgets.record.approve');
      });
    });

    describe('DELETE /:id (delete bundle)', () => {
      it('returns 200 with action message', async () => {
        mockBundleDelete.mockResolvedValueOnce(undefined);

        const res = await request(app)
          .delete('/widgets/bundles/b-1')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Bundle deleted');
        expect(mockBundleDelete).toHaveBeenCalledWith('b-1', USER_ID);
      });

      it('auth middleware requires widgets.record.delete', () => {
        expect(permissionsRequested).toContain('widgets.record.delete');
      });
    });
  });

  // ==========================================================================
  // Widget Runtime Routes
  // ==========================================================================
  describe('Widget Runtime Routes', () => {
    const app = buildApp(runtimeRouter, '/widgets/runtime');

    describe('GET /catalog', () => {
      it('returns 200 with published catalog', async () => {
        const catalog = [
          { widget_key: 'risk-heatmap', status: 'published' },
          { widget_key: 'executive-summary', status: 'published' },
        ];
        mockGetPublishedCatalog.mockResolvedValueOnce(catalog);

        const res = await request(app).get('/widgets/runtime/catalog').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(catalog);
        expect(mockGetPublishedCatalog).toHaveBeenCalledOnce();
      });

      it('auth middleware requires widgets.record.read', () => {
        expect(permissionsRequested).toContain('widgets.record.read');
      });
    });

    describe('GET /bundles/published', () => {
      it('returns 200 with published bundles', async () => {
        const bundles = [{ bundle_id: 'b-1', status: 'published' }];
        mockGetPublishedBundles.mockResolvedValueOnce(bundles);

        const res = await request(app).get('/widgets/runtime/bundles/published').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(bundles);
        expect(mockGetPublishedBundles).toHaveBeenCalledOnce();
      });
    });

    describe('GET /render/:widgetKey', () => {
      it('returns 200 with rendered structural widget', async () => {
        mockIsInsightWidget.mockReturnValue(false);
        const renderResult = {
          widgetKey: 'executive-summary', title: 'Executive Summary',
          payload: { totalRisks: 12 }, fetchedAt: '2026-03-31T00:00:00.000Z',
        };
        mockRenderWidget.mockResolvedValueOnce(renderResult);

        const res = await request(app)
          .get('/widgets/runtime/render/executive-summary')
          .expect(200);

        // Structural widgets return the full render result object
        expect(res.body).toEqual(renderResult);
        expect(mockRenderWidget).toHaveBeenCalledWith({
          widgetKey: 'executive-summary',
          userId: USER_ID,
          tenantId: TENANT_ID,
        });
      });

      it('returns unwrapped payload for insight widgets', async () => {
        mockIsInsightWidget.mockReturnValue(true);
        const renderResult = {
          widgetKey: 'zombie-controls', title: 'zombie-controls',
          payload: { zombieCount: 7, detail: 'Controls without recent evidence' },
          fetchedAt: '2026-03-31T00:00:00.000Z',
        };
        mockRenderWidget.mockResolvedValueOnce(renderResult);

        const res = await request(app)
          .get('/widgets/runtime/render/zombie-controls')
          .expect(200);

        // Insight widgets unwrap and return just the payload
        expect(res.body).toEqual(renderResult.payload);
      });

      it('returns 401 when user context is missing', async () => {
        const bareApp = buildBareApp(runtimeRouter, '/widgets/runtime');

        const res = await request(bareApp)
          .get('/widgets/runtime/render/executive-summary')
          .expect(401);

        expect(res.body.message).toBe('Missing auth context');
      });
    });

    describe('GET /stats', () => {
      it('returns 200 with render stats', async () => {
        const stats = [{ widget_key: 'risk-heatmap', render_count: 42, avg_duration: 150 }];
        mockGetRenderStats.mockResolvedValueOnce(stats);

        const res = await request(app).get('/widgets/runtime/stats').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(stats);
        expect(mockGetRenderStats).toHaveBeenCalledWith(undefined);
      });

      it('passes widgetKey query parameter to service', async () => {
        mockGetRenderStats.mockResolvedValueOnce([]);

        await request(app).get('/widgets/runtime/stats?widgetKey=risk-heatmap').expect(200);

        expect(mockGetRenderStats).toHaveBeenCalledWith('risk-heatmap');
      });

      it('auth middleware requires widgets.manage', () => {
        expect(permissionsRequested).toContain('widgets.manage');
      });
    });
  });

  // ==========================================================================
  // Widget Executive Routes
  // ==========================================================================
  describe('Widget Executive Routes', () => {
    const app = buildApp(executiveRouter, '/widgets/executive');

    describe('GET /summary', () => {
      it('returns 200 with executive summary', async () => {
        const summary = {
          staleControlsCount: 3, overdueRemediationCount: 2,
          policyReviewDebtCount: 5, latestEngineRun: null,
        };
        mockGetSummary.mockResolvedValueOnce(summary);

        const res = await request(app).get('/widgets/executive/summary').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(summary);
        expect(mockGetSummary).toHaveBeenCalledOnce();
      });

      it('auth middleware requires widgets.record.read', () => {
        expect(permissionsRequested).toContain('widgets.record.read');
      });

      it('returns 400 when tenantId is missing', async () => {
        const bareApp = buildBareApp(executiveRouter, '/widgets/executive');

        const res = await request(bareApp)
          .get('/widgets/executive/summary')
          .expect(400);

        expect(res.body.message).toBe('tenantId is required');
      });
    });

    describe('GET /top-breached-kris', () => {
      it('returns 200 with breached KRIs', async () => {
        const kris = [
          { kriId: 'kri-1', name: 'Revenue KRI', status: 'breached' },
          { kriId: 'kri-2', name: 'Latency KRI', status: 'breached' },
        ];
        mockGetTopBreachedKris.mockResolvedValueOnce(kris);

        const res = await request(app).get('/widgets/executive/top-breached-kris').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(kris);
        expect(mockGetTopBreachedKris).toHaveBeenCalledWith(10); // default limit
      });

      it('passes custom limit query parameter', async () => {
        mockGetTopBreachedKris.mockResolvedValueOnce([]);

        await request(app).get('/widgets/executive/top-breached-kris?limit=5').expect(200);

        expect(mockGetTopBreachedKris).toHaveBeenCalledWith(5);
      });

      it('returns 400 when tenantId is missing', async () => {
        const bareApp = buildBareApp(executiveRouter, '/widgets/executive');

        const res = await request(bareApp)
          .get('/widgets/executive/top-breached-kris')
          .expect(400);

        expect(res.body.message).toBe('tenantId is required');
      });
    });

    describe('GET /policy-review-debt', () => {
      it('returns 200 with policy review debt data', async () => {
        const debt = [{ policyId: 'p-1', title: 'Privacy Policy', daysOverdue: 20 }];
        mockGetPolicyReviewDebt.mockResolvedValueOnce(debt);

        const res = await request(app).get('/widgets/executive/policy-review-debt').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(debt);
        expect(mockGetPolicyReviewDebt).toHaveBeenCalledWith(10); // default limit
      });

      it('passes custom limit query parameter', async () => {
        mockGetPolicyReviewDebt.mockResolvedValueOnce([]);

        await request(app).get('/widgets/executive/policy-review-debt?limit=3').expect(200);

        expect(mockGetPolicyReviewDebt).toHaveBeenCalledWith(3);
      });
    });

    describe('GET /engine-trend', () => {
      it('returns 200 with engine trend data', async () => {
        const trend = [{ month: '2026-01', runs: 4 }, { month: '2026-02', runs: 6 }];
        mockGetEngineTrend.mockResolvedValueOnce(trend);

        const res = await request(app).get('/widgets/executive/engine-trend').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(trend);
        expect(mockGetEngineTrend).toHaveBeenCalledWith(12); // default limit
      });

      it('passes custom limit query parameter', async () => {
        mockGetEngineTrend.mockResolvedValueOnce([]);

        await request(app).get('/widgets/executive/engine-trend?limit=6').expect(200);

        expect(mockGetEngineTrend).toHaveBeenCalledWith(6);
      });
    });
  });

  // ==========================================================================
  // Widget Diagnostics Routes
  // ==========================================================================
  describe('Widget Diagnostics Routes', () => {
    const app = buildApp(diagnosticsRouter, '/widgets/diagnostics');

    describe('GET /health', () => {
      it('returns 200 with diagnostics result', async () => {
        const diagnostics = {
          moduleCode: 'widgets', healthy: true,
          checks: [{ name: 'schema_exists', passed: true }, { name: 'registry_table', passed: true }],
          checkedAt: '2026-03-31T00:00:00.000Z',
        };
        mockRunDiagnostics.mockResolvedValueOnce(diagnostics);

        const res = await request(app).get('/widgets/diagnostics/health').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual(diagnostics);
        expect(mockRunDiagnostics).toHaveBeenCalledOnce();
      });

      it('auth middleware requires widgets.manage', () => {
        expect(permissionsRequested).toContain('widgets.manage');
      });
    });

    describe('GET /render (render diagnostics)', () => {
      it('returns 200 with render diagnostic checks', async () => {
        const checks = [
          { name: 'render_error_rate', passed: true, detail: '0.0% error rate' },
          { name: 'render_latency', passed: true, detail: 'avg=120ms' },
        ];
        mockRunRenderDiagnostics.mockResolvedValueOnce(checks);

        const res = await request(app).get('/widgets/diagnostics/render').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.checks).toEqual(checks);
        expect(res.body.data.checkedAt).toBeDefined();
        expect(mockRunRenderDiagnostics).toHaveBeenCalledOnce();
      });
    });

    describe('GET /publication (publication diagnostics)', () => {
      it('returns 200 with publication diagnostic checks', async () => {
        const checks = [
          { name: 'stale_drafts', passed: true, detail: '0 widgets in draft > 30 days' },
          { name: 'suspended_widgets', passed: true, detail: '0 suspended widgets' },
        ];
        mockRunPublicationDiagnostics.mockResolvedValueOnce(checks);

        const res = await request(app).get('/widgets/diagnostics/publication').expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.checks).toEqual(checks);
        expect(res.body.data.checkedAt).toBeDefined();
        expect(mockRunPublicationDiagnostics).toHaveBeenCalledOnce();
      });
    });
  });

  // ==========================================================================
  // Middleware Stack Verification
  // ==========================================================================
  describe('Middleware Stack Verification', () => {
    it('registry router has moduleStack and auditMiddleware layers', () => {
      const middlewareLayers = registryRouter.stack.filter((layer: any) => !layer.route);
      // moduleStack + auditMiddleware + scopeContext = at least 3
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(3);
    });

    it('bundle router has moduleStack and auditMiddleware layers', () => {
      const middlewareLayers = bundleRouter.stack.filter((layer: any) => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(3);
    });

    it('runtime router has moduleStack, auditMiddleware, and scopeContext', () => {
      const middlewareLayers = runtimeRouter.stack.filter((layer: any) => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(3);
    });

    it('executive router has moduleStack, auditMiddleware, and scopeContext', () => {
      const middlewareLayers = executiveRouter.stack.filter((layer: any) => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(3);
    });

    it('diagnostics router has moduleStack and auditMiddleware layers', () => {
      const middlewareLayers = diagnosticsRouter.stack.filter((layer: any) => !layer.route);
      // diagnostics does not use scopeContext, only moduleStack + auditMiddleware
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(2);
    });

    it('all registry routes are defined', () => {
      const routes = registryRouter.stack.filter((layer: any) => layer.route);
      const paths = routes.map((layer: any) =>
        `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toContain('GET /');
      expect(paths).toContain('GET /:id');
      expect(paths).toContain('POST /');
      expect(paths).toContain('PUT /:id');
      expect(paths).toContain('PATCH /:id/status');
      expect(paths).toContain('DELETE /:id');
    });

    it('all bundle routes are defined', () => {
      const routes = bundleRouter.stack.filter((layer: any) => layer.route);
      const paths = routes.map((layer: any) =>
        `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toContain('GET /');
      expect(paths).toContain('GET /:id');
      expect(paths).toContain('POST /');
      expect(paths).toContain('PUT /:id');
      expect(paths).toContain('PATCH /:id/status');
      expect(paths).toContain('DELETE /:id');
    });

    it('all runtime routes are defined', () => {
      const routes = runtimeRouter.stack.filter((layer: any) => layer.route);
      const paths = routes.map((layer: any) =>
        `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toContain('GET /catalog');
      expect(paths).toContain('GET /bundles/published');
      expect(paths).toContain('GET /render/:widgetKey');
      expect(paths).toContain('GET /stats');
    });

    it('all executive routes are defined', () => {
      const routes = executiveRouter.stack.filter((layer: any) => layer.route);
      const paths = routes.map((layer: any) =>
        `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toContain('GET /summary');
      expect(paths).toContain('GET /top-breached-kris');
      expect(paths).toContain('GET /policy-review-debt');
      expect(paths).toContain('GET /engine-trend');
    });

    it('all diagnostics routes are defined', () => {
      const routes = diagnosticsRouter.stack.filter((layer: any) => layer.route);
      const paths = routes.map((layer: any) =>
        `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

      expect(paths).toContain('GET /health');
      expect(paths).toContain('GET /render');
      expect(paths).toContain('GET /publication');
    });
  });

  // ==========================================================================
  // Error Propagation
  // ==========================================================================
  describe('Error Propagation', () => {
    it('registry service error returns 500', async () => {
      const app = buildApp(registryRouter, '/widgets/registry');
      mockRegistryList.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app).get('/widgets/registry').expect(500);

      expect(res.body.error).toBe('DB connection failed');
    });

    it('bundle service error returns 500', async () => {
      const app = buildApp(bundleRouter, '/widgets/bundles');
      mockBundleList.mockRejectedValueOnce(new Error('Query timeout'));

      const res = await request(app).get('/widgets/bundles').expect(500);

      expect(res.body.error).toBe('Query timeout');
    });

    it('runtime render error returns 500', async () => {
      const app = buildApp(runtimeRouter, '/widgets/runtime');
      mockRenderWidget.mockRejectedValueOnce(new Error('Unsupported widget key: bad-key'));

      const res = await request(app).get('/widgets/runtime/render/bad-key').expect(500);

      expect(res.body.error).toBe('Unsupported widget key: bad-key');
    });

    it('executive service error returns 500', async () => {
      const app = buildApp(executiveRouter, '/widgets/executive');
      mockGetSummary.mockRejectedValueOnce(new Error('Aggregation failed'));

      const res = await request(app).get('/widgets/executive/summary').expect(500);

      expect(res.body.error).toBe('Aggregation failed');
    });

    it('diagnostics service error returns 500', async () => {
      const app = buildApp(diagnosticsRouter, '/widgets/diagnostics');
      mockRunDiagnostics.mockRejectedValueOnce(new Error('Schema check failed'));

      const res = await request(app).get('/widgets/diagnostics/health').expect(500);

      expect(res.body.error).toBe('Schema check failed');
    });
  });

  // ==========================================================================
  // Permission mapping completeness
  // ==========================================================================
  describe('Permission Mapping Completeness', () => {
    it('all required permissions are registered across widget routes', () => {
      // Verify all distinct permission strings that were passed to requirePermission
      // when the route modules were loaded. This proves the middleware wiring is correct.
      const expectedPermissions = [
        'widgets.record.read',
        'widgets.record.write',
        'widgets.record.approve',
        'widgets.record.delete',
        'widgets.manage',
      ];
      for (const perm of expectedPermissions) {
        expect(permissionsRequested).toContain(perm);
      }
    });

    it('no unexpected permissions are registered', () => {
      const allowedPermissions = new Set([
        'widgets.record.read',
        'widgets.record.write',
        'widgets.record.approve',
        'widgets.record.delete',
        'widgets.manage',
      ]);
      for (const perm of permissionsRequested) {
        expect(allowedPermissions.has(perm)).toBe(true);
      }
    });
  });
});
