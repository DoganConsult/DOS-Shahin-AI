import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEvaluateAccess = vi.fn();
vi.mock('./decision-engine', () => ({
  evaluateAccess: (...args: unknown[]) => mockEvaluateAccess(...args),
  invalidatePermissionCache: vi.fn(),
}));

import { requireRole } from './access.resolver';
import type { Request, Response } from 'express';

function mockReq(user: any): Request {
  return { user, tenantId: user?.tenantId ?? 't-1', ip: '127.0.0.1', originalUrl: '/test' } as unknown;
}

function mockRes(): Response {
  const res: any = {};
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn(() => res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEvaluateAccess.mockResolvedValue({ allowed: true, reason: 'ok' });
});

describe('DAuth AccessResolver', () => {
  describe('requireRole', () => {
    it('returns 401 when no user', async () => {
      const middleware = requireRole('admin');
      const req = mockReq(undefined);
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows super_admin regardless of required role', async () => {
      const middleware = requireRole('auditor');
      const req = mockReq({ role: 'viewer', is_super_admin: true, tenantId: 't-1' });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows matching role', async () => {
      const middleware = requireRole('admin', 'auditor');
      const req = mockReq({ role: 'auditor', tenantId: 't-1' });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('rejects non-matching role', async () => {
      const middleware = requireRole('admin');
      const req = mockReq({ role: 'viewer', tenantId: 't-1' });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects tenant_admin when only admin is allowed (no aliases — exact match)', async () => {
      const middleware = requireRole('admin');
      const req = mockReq({ role: 'tenant_admin', tenantId: 't-1' });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when no tenant context', async () => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'admin' } } as unknown;
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
