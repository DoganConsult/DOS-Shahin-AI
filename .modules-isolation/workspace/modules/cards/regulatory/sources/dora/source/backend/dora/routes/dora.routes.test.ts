/**
 * DORA Routes — Integration Tests
 *
 * MP-25 §12: Integration tests for route groups and contract paths.
 * Verifies that all expected route groups are registered and properly configured.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Express Router
const routeEntries: { method: string; path: string }[] = [];
const mockRouter = {
  use: vi.fn(),
  get: vi.fn((...args: unknown[]) => {
    routeEntries.push({ method: 'GET', path: args[0] as string });
  }),
  post: vi.fn((...args: unknown[]) => {
    routeEntries.push({ method: 'POST', path: args[0] as string });
  }),
  put: vi.fn((...args: unknown[]) => {
    routeEntries.push({ method: 'PUT', path: args[0] as string });
  }),
  delete: vi.fn((...args: unknown[]) => {
    routeEntries.push({ method: 'DELETE', path: args[0] as string });
  }),
};

vi.mock('express', () => ({
  Router: vi.fn(() => mockRouter),
}));

// Mock middleware
vi.mock('../../../platform/dos/http/error-handling/async-handler', () => ({
  asyncHandler: vi.fn((fn: any) => fn),
}));
vi.mock('../../../platform/dauth', () => ({
  authenticate: vi.fn((_req: any, _res: any, next: any) => next()),
  requirePermission: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next())),
}));
vi.mock('../../../platform/dos/http/middleware/audit', () => ({
  auditMiddleware: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next())),
}));
vi.mock('../../../platform/dos/http/middleware/module-stack', () => ({
  moduleStack: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next())),
}));

// Mock repositories
vi.mock('../repositories/dora.repository', () => ({
  DoraIctAssetRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    softDelete: vi.fn().mockResolvedValue(false),
  })),
  DoraResilienceTestRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue(null),
  })),
  DoraMajorIncidentRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
  })),
  DoraThreatIntelRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    create: vi.fn().mockResolvedValue(null),
    acknowledge: vi.fn().mockResolvedValue(null),
  })),
  DoraBackupConfigRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
  })),
  DoraThirdPartyProviderRepository: vi.fn().mockImplementation(() => ({
    findAll: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    softDelete: vi.fn().mockResolvedValue(false),
  })),
}));

// Mock schemas, services, and database
vi.mock('../schemas/dora.schemas', () => ({
  createIctAssetBody: { parse: vi.fn((v: any) => v) },
  updateIctAssetBody: { parse: vi.fn((v: any) => v) },
  listIctAssetsQuery: { parse: vi.fn((v: any) => v) },
  createResilienceTestBody: { parse: vi.fn((v: any) => v) },
  updateResilienceTestBody: { parse: vi.fn((v: any) => v) },
  createMajorIncidentBody: { parse: vi.fn((v: any) => v) },
  updateMajorIncidentBody: { parse: vi.fn((v: any) => v) },
  createThreatIntelBody: { parse: vi.fn((v: any) => v) },
  createBackupConfigBody: { parse: vi.fn((v: any) => v) },
  updateBackupConfigBody: { parse: vi.fn((v: any) => v) },
  createThirdPartyProviderBody: { parse: vi.fn((v: any) => v) },
  updateThirdPartyProviderBody: { parse: vi.fn((v: any) => v) },
  listThirdPartyProvidersQuery: { parse: vi.fn((v: any) => v) },
}));
vi.mock('../../../schemas/common.schemas', () => ({
  paginationQuery: { parse: vi.fn((v: any) => v), merge: vi.fn().mockReturnThis() },
  statusFilter: {},
  bulkIdsBody: {},
}));
vi.mock('../services/dora-event.service', () => ({
  emitDoraEvent: vi.fn().mockResolvedValue(undefined),
  emitDoraStatusChange: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [{ cnt: 0 }] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

describe('DORA Routes', () => {
  it('registers moduleStack and auditMiddleware', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(mockRouter.use).toHaveBeenCalled();
  });

  it('registers overview route', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    const overview = routeEntries.find(r => r.path === '/overview' && r.method === 'GET');
    expect(overview).toBeDefined();
  });

  it('registers ICT asset CRUD routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/ict-assets' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/ict-assets/:id' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/ict-assets' && r.method === 'POST')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/ict-assets/:id' && r.method === 'PUT')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/ict-assets/:id' && r.method === 'DELETE')).toBeDefined();
  });

  it('registers resilience test routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/resilience-tests' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/resilience-tests/:id' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/resilience-tests' && r.method === 'POST')).toBeDefined();
  });

  it('registers major incident routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/major-incidents' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/major-incidents' && r.method === 'POST')).toBeDefined();
  });

  it('registers threat intel routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/threat-intel' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/threat-intel' && r.method === 'POST')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/threat-intel/:id/acknowledge' && r.method === 'PUT')).toBeDefined();
  });

  it('registers backup config routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/backup-configs' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/backup-configs' && r.method === 'POST')).toBeDefined();
  });

  it('registers third-party provider routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/third-party-providers' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/third-party-providers' && r.method === 'POST')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/third-party-providers/:id' && r.method === 'DELETE')).toBeDefined();
  });

  it('registers obligation routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/obligations' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/obligations' && r.method === 'POST')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/obligations/:id' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/obligations/:id' && r.method === 'PUT')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/obligations/:id' && r.method === 'DELETE')).toBeDefined();
  });

  it('registers mapping routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/mappings/frameworks' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/mappings/frameworks' && r.method === 'POST')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/mappings/controls' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/mappings/controls' && r.method === 'POST')).toBeDefined();
  });

  it('registers dashboard routes', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/dashboard/readiness' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/dashboard/gaps' && r.method === 'GET')).toBeDefined();
    expect(routeEntries.find(r => r.path === '/dashboard/trends' && r.method === 'GET')).toBeDefined();
  });

  it('registers lifecycle transition route', async () => {
    routeEntries.length = 0;
    await import('./dora.routes');

    expect(routeEntries.find(r => r.path === '/:entityType/:entityId/transition' && r.method === 'POST')).toBeDefined();
  });
});
