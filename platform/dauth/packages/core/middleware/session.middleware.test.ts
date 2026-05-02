import type {} from '@dos/types/express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, optionalAuthenticate, _setBlacklistChecker } from './session.middleware';
import { generateAccessToken } from '../identity/token.service';
import type { Request, Response } from 'express';

// Inject a no-blacklist checker for tests
beforeEach(() => {
  _setBlacklistChecker(async () => false);
});

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, originalUrl: '/api/test', ...overrides } as unknown;
}

function mockRes(): Response {
  const res: any = { statusCode: 200 };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn(() => res);
  return res;
}

describe('DAuth SessionMiddleware', () => {
  describe('authenticate', () => {
    it('returns 401 when no Authorization header', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid token', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid.token' } as Record<string, string> });
      const res = mockRes();
      const next = vi.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes with valid token and sets req.user + req.tenantId', async () => {
      const token = generateAccessToken({ userId: 'u-001', email: 'a@b.com', tenantId: 't-001', role: 'admin' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as Record<string, string> });
      const res = mockRes();
      const next = vi.fn();
      await authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('u-001');
      expect(req.tenantId).toBe('t-001');
    });

    it('returns 403 on tenant mismatch', async () => {
      const token = generateAccessToken({ userId: 'u-001', email: 'a@b.com', tenantId: 't-001', role: 'admin' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as Record<string, string> });
      req.resolvedTenantId = 't-OTHER';
      const res = mockRes();
      const next = vi.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is blacklisted (fail-closed)', async () => {
      _setBlacklistChecker(async () => true);
      const token = generateAccessToken({ userId: 'u-001', email: 'a@b.com', tenantId: 't-001', role: 'admin' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as Record<string, string> });
      const res = mockRes();
      const next = vi.fn();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('passes through without token', () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();
      optionalAuthenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('sets user if valid token provided', () => {
      const token = generateAccessToken({ userId: 'u-002', email: 'b@c.com', tenantId: 't-002', role: 'viewer' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as Record<string, string> });
      const res = mockRes();
      const next = vi.fn();
      optionalAuthenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('u-002');
    });

    it('passes through silently on invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer bad' } as Record<string, string> });
      const res = mockRes();
      const next = vi.fn();
      optionalAuthenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });
});
