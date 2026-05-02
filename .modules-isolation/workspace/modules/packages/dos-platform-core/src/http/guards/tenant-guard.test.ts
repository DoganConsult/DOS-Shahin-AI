import { describe, it, expect, vi } from 'vitest';
import { tenantGuard } from './tenant-guard';

// Stub Express types for the test surface.
type Req = Record<string, any>;
type Res = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};
function makeRes(): Res {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Res;
}

describe('tenantGuard', () => {
  describe('factory invocation: tenantGuard(opts?)', () => {
    it('returns a middleware that calls next() when tenantId is present', async () => {
      const mw = tenantGuard();
      const req: Req = { path: '/api/foo', headers: { 'x-tenant-id': 't1' }, user: { tenantId: 't1' } };
      const res = makeRes();
      const next = vi.fn();
      await mw(req as any, res as any, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns a middleware that 403s when tenantId is missing', async () => {
      const mw = tenantGuard();
      const req: Req = { path: '/api/foo', headers: {}, user: {} };
      const res = makeRes();
      const next = vi.fn();
      await mw(req as any, res as any, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TENANT_CONTEXT_MISSING' }));
    });

    it('skips public prefixes', async () => {
      const mw = tenantGuard();
      const req: Req = { path: '/health', headers: {} };
      const res = makeRes();
      const next = vi.fn();
      await mw(req as any, res as any, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('legacy direct-middleware invocation: router.use(tenantGuard)', () => {
    // Regression: pre-fix, calling tenantGuard(req, res, next) treated req as
    // options, returned the inner middleware as a value, and never invoked
    // next() — causing 60s request hangs (Phase 2 DoD harness on
    // /api/process-tasks/*). The defensive guard detects the (req, res, next)
    // signature and runs as middleware with default options.
    it('detects (req, res, next) call and runs as middleware', async () => {
      const req: Req = { path: '/api/foo', headers: { 'x-tenant-id': 't1' }, user: { tenantId: 't1' } };
      const res = makeRes();
      const next = vi.fn();
      // Call tenantGuard the wrong (legacy) way — the defensive guard should
      // recover and call next().
      await (tenantGuard as any)(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('still 403s missing tenant when called direct-middleware-style', async () => {
      const req: Req = { path: '/api/foo', headers: {}, user: {} };
      const res = makeRes();
      const next = vi.fn();
      await (tenantGuard as any)(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
