import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/events', () => ({ publish: vi.fn(), emitEvent: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@dos/platform-core/resilience', () => ({ catchHandler: () => () => {}, swallow: vi.fn(), EC: { EVENT_BUS: 'EVENT_BUS' } }));
vi.mock('@dos/platform-core/http', () => ({
  asyncHandler: (fn: Function) => fn,
  ok: (d: unknown) => ({ success: true, data: d }),
  paginated: (d: unknown[], t: number) => ({ data: d, total: t }),
  action: (d: unknown) => ({ success: true, data: d }),
  validate: () => (req: unknown, res: unknown, next: Function) => next(),
  auditMiddleware: () => (req: unknown, res: unknown, next: Function) => next(),
  automationMiddleware: () => (req: unknown, res: unknown, next: Function) => next(),
  setAuditData: vi.fn(),
}));
vi.mock('../middleware/session.middleware', () => ({
  authenticate: (req: unknown, res: unknown, next: Function) => { (req as Record<string, unknown>).user = { userId: 'u-001', tenantId: 't-001' }; (req as Record<string, unknown>).tenantId = 't-001'; next(); },
}));
vi.mock('../access/access.resolver', () => ({
  requirePermission: () => (req: unknown, res: unknown, next: Function) => next(),
  requireAnyPermission: () => (req: unknown, res: unknown, next: Function) => next(),
  requireSuperAdmin: (req: unknown, res: unknown, next: Function) => next(),
  invalidatePermissionCache: vi.fn(),
}));
vi.mock('..', () => ({
  authenticate: (req: unknown, res: unknown, next: Function) => { (req as Record<string, unknown>).user = { userId: 'u-001', tenantId: 't-001' }; (req as Record<string, unknown>).tenantId = 't-001'; next(); },
  requirePermission: () => (req: unknown, res: unknown, next: Function) => next(),
}));

describe('access-contract routes', () => {
  it('module exports a router', async () => {
    const mod = await import('./access-contract.routes');
    expect(mod.default || mod.router).toBeDefined();
  });
});
