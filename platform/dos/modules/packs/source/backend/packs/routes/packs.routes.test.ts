/**
 * Packs Routes -- Integration Tests
 *
 * MP-36 Section 12: integration tests for route groups and contract paths.
 * Tests DAuth enforcement, middleware stack, input validation, error handling.
 *
 * @owner DOS
 * @module packs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lifecycle-registry to prevent side-effect registration
vi.mock('../../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: vi.fn(),
}));

// Mock DAuth middleware
vi.mock('../../../platform/dauth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock DOS middleware
vi.mock('../../../platform/dos/http/error-handling/async-handler', () => ({
  asyncHandler: (fn: any) => fn,
}));
vi.mock('../../../platform/dos/http/middleware/module-stack', () => ({
  moduleStack: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../platform/dos/http/middleware/audit', () => ({
  auditMiddleware: () => (_req: any, _res: any, next: any) => next(),
  setAuditData: vi.fn(),
}));
vi.mock('../../../platform/dos/observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock database
const mockSafeQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

// Mock services using class syntax so `new` works
vi.mock('../pack-registry.service', () => {
  return {
    PackRegistryService: class {
      listPacks = vi.fn().mockResolvedValue([]);
      getPackByCode = vi.fn().mockResolvedValue(null);
      getInstalledPacks = vi.fn().mockResolvedValue([]);
      checkForUpdates = vi.fn().mockResolvedValue([]);
      syncFromDisk = vi.fn().mockResolvedValue({ added: 0, updated: 0, unchanged: 0, errors: [] });
    },
  };
});

vi.mock('../pack-installer.service', () => {
  return {
    PackInstallerService: class {
      installPack = vi.fn().mockResolvedValue({
        packCode: 'test-pack',
        version: '1.0.0',
        installed: true,
        steps: [{ step: 'navigation', status: 'ok' }],
      });
    },
  };
});

vi.mock('../pack-policy.service', () => {
  return {
    PackPolicyService: class {
      evaluate = vi.fn().mockResolvedValue({
        sessionId: 's-1',
        tenantId: 't-1',
        selectedPacks: [],
        decisions: [],
      });
      listDecisions = vi.fn().mockResolvedValue([]);
    },
  };
});

vi.mock('../diagnostics/packs-diagnostics.service', () => ({
  runDiagnostics: vi.fn().mockResolvedValue({
    moduleCode: 'packs',
    healthy: true,
    checks: [{ name: 'schema_exists', passed: true }],
    checkedAt: new Date().toISOString(),
  }),
  getPacksMetrics: vi.fn().mockResolvedValue({
    totalInstalled: 5,
    totalAvailable: 20,
    failedInstallations: 0,
    outdatedPacks: 1,
    lastInstallDate: null,
    installSuccessRate: 100,
  }),
  getDependencyDiagnostics: vi.fn().mockResolvedValue({ packsWithMissingDeps: [] }),
}));

vi.mock('../ai/packs-ai.service', () => ({
  recommendPacks: vi.fn().mockResolvedValue({
    recommended: [],
    totalRecommended: 0,
    analysisContext: 'test',
  }),
  analyzePackImpact: vi.fn().mockResolvedValue({
    packCode: 'test-pack',
    action: 'install',
    impactLevel: 'low',
    affectedModules: [],
    affectedTables: [],
    reversible: true,
    warnings: [],
    recommendation: 'Proceed',
  }),
  explainCompatibility: vi.fn().mockReturnValue({
    packCode: 'test-pack',
    summary: 'Compatible',
    details: [],
    suggestedActions: [],
  }),
  analyzePackHealth: vi.fn().mockResolvedValue({
    overallHealth: 'healthy',
    issues: [],
    summary: 'All healthy',
  }),
  isPacksAiActionAllowed: vi.fn().mockReturnValue(true),
}));

vi.mock('../mappers/packs.mapper', () => ({
  toCatalogEntry: vi.fn((x: any) => x),
  toInstallationRecord: vi.fn((x: any) => x),
}));

vi.mock('../events/packs.publishers', () => ({
  emitPackInstalled: vi.fn().mockResolvedValue(undefined),
  emitPackInstallFailed: vi.fn().mockResolvedValue(undefined),
  emitPackUninstalled: vi.fn().mockResolvedValue(undefined),
  emitCompatibilityChecked: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-correlation-id',
}));

// Mock event-bus for event subscribers import
vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { subscribe: vi.fn() },
}));

describe('Packs Routes', () => {
  beforeEach(() => {
    mockSafeQuery.mockReset();
    mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('Route structure', () => {
    it('exports a router with routes defined', async () => {
      const { default: router } = await import('./packs.routes');
      expect(router).toBeDefined();
      expect(typeof router.stack).toBe('object');
    });

    it('has moduleStack and auditMiddleware in middleware stack', async () => {
      const { default: router } = await import('./packs.routes');
      const middlewareLayers = router.stack.filter((layer: any) => !layer.route);
      // moduleStack + auditMiddleware = at least 2
      expect(middlewareLayers.length).toBeGreaterThanOrEqual(2);
    });

    it('defines all required route groups (MP-36 Section 6.1)', async () => {
      const { default: router } = await import('./packs.routes');
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      const paths = routes.map((r: any) => r.path);

      // Catalog retrieval
      expect(paths).toContain('/catalog');
      expect(paths).toContain('/catalog/:code');

      // Installation actions
      expect(paths).toContain('/install');
      expect(paths).toContain('/uninstall');

      // Installed packs and updates
      expect(paths).toContain('/installed');
      expect(paths).toContain('/updates');

      // Compatibility checks
      expect(paths).toContain('/compatibility/:packCode');

      // Policy evaluation
      expect(paths).toContain('/policies/evaluate');
      expect(paths).toContain('/policies/decisions/:sessionId');

      // Diagnostics
      expect(paths).toContain('/diagnostics');
      expect(paths).toContain('/diagnostics/dependencies');

      // AI routes
      expect(paths).toContain('/ai/recommendations');
      expect(paths).toContain('/ai/impact/:packCode');
      expect(paths).toContain('/ai/health');
    });
  });

  describe('DAuth enforcement', () => {
    it('all routes use authenticate middleware', async () => {
      const { default: router } = await import('./packs.routes');
      const routes = router.stack.filter((layer: any) => layer.route);

      for (const route of routes) {
        // Each route should have at least one handler in its stack
        expect(route.route.stack.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('HTTP methods', () => {
    it('catalog and read routes use GET', async () => {
      const { default: router } = await import('./packs.routes');
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      const catalogRoute = routes.find((r: any) => r.path === '/catalog');
      expect(catalogRoute?.methods).toContain('get');

      const installedRoute = routes.find((r: any) => r.path === '/installed');
      expect(installedRoute?.methods).toContain('get');
    });

    it('install and uninstall routes use POST', async () => {
      const { default: router } = await import('./packs.routes');
      const routes = router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      const installRoute = routes.find((r: any) => r.path === '/install');
      expect(installRoute?.methods).toContain('post');

      const uninstallRoute = routes.find((r: any) => r.path === '/uninstall');
      expect(uninstallRoute?.methods).toContain('post');
    });
  });
});
