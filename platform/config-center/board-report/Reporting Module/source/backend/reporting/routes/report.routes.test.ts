import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../platform/dauth', () => ({
  authenticate: (_r: any, _s: any, n: any) => n(),
  requirePermission: () => (_r: any, _s: any, n: any) => n(),
}));
vi.mock('../../../../platform/dos/http/error-handling/async-handler', () => ({
  asyncHandler: (fn: any) => fn,
}));
vi.mock('../../../../platform/dos/http/middleware/module-stack', () => ({
  moduleStack: () => (_r: any, _s: any, n: any) => n(),
}));
vi.mock('../../../../platform/dos/http/middleware/audit', () => ({
  auditMiddleware: () => (_r: any, _s: any, n: any) => n(),
  setAuditData: vi.fn(),
}));

describe('Report Routes', () => {
  it('exports a router', async () => {
    const mod = await import('./report/report.routes');
    expect(mod.default).toBeDefined();
  });
});
