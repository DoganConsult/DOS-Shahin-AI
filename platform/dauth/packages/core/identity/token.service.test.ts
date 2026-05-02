import { describe, it, expect, vi } from 'vitest';
import {
  generateAccessToken,
  verifyAccessToken,
  decodeTokenUnsafe,
  getAccessTokenExpirySeconds,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  type AuthPayload,
} from './token.service';

describe('DAuth TokenService', () => {
  const payload: AuthPayload = {
    userId: 'u-001',
    email: 'test@example.com',
    tenantId: 't-001',
    role: 'admin',
  };

  describe('generateAccessToken + verifyAccessToken', () => {
    it('generates a valid JWT that can be verified', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('u-001');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.tenantId).toBe('t-001');
      expect(decoded.role).toBe('admin');
      expect(decoded.jti).toBeTruthy(); // JTI auto-generated
    });

    it('preserves explicit jti if provided', () => {
      const token = generateAccessToken({ ...payload, jti: 'custom-jti' });
      const decoded = verifyAccessToken(token);
      expect(decoded.jti).toBe('custom-jti');
    });

    it('throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });
  });

  describe('decodeTokenUnsafe', () => {
    it('decodes without verification', () => {
      const token = generateAccessToken(payload);
      const decoded = decodeTokenUnsafe(token);
      expect(decoded).toBeTruthy();
      expect(decoded!.jti).toBeTruthy();
      expect(decoded!.exp).toBeGreaterThan(0);
    });

    it('returns null for garbage input', () => {
      expect(decodeTokenUnsafe('not-a-jwt')).toBeNull();
    });
  });

  describe('getAccessTokenExpirySeconds', () => {
    it('returns a positive number', () => {
      const seconds = getAccessTokenExpirySeconds();
      expect(seconds).toBeGreaterThan(0);
    });
  });

  describe('generateRefreshToken + verifyRefreshToken', () => {
    it('generates and verifies a refresh token', () => {
      const token = generateRefreshToken('u-001', 't-001', true);
      expect(token).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded).toBeTruthy();
      expect(decoded!.userId).toBe('u-001');
      expect(decoded!.tenantId).toBe('t-001');
      expect(decoded!.jti).toBeTruthy();
    });

    it('rejects an access token as refresh', () => {
      const accessToken = generateAccessToken(payload);
      expect(verifyRefreshToken(accessToken)).toBeNull();
    });

    it('returns null for invalid token', () => {
      expect(verifyRefreshToken('invalid')).toBeNull();
    });
  });

  describe('setRefreshTokenCookie', () => {
    function mockRes() {
      return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown;
    }

    it('sets secure:true when NODE_ENV=production at call time', () => {
      const orig = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = mockRes();
        setRefreshTokenCookie(res, 'tok', true);
        expect(res.cookie).toHaveBeenCalledOnce();
        const opts = res.cookie.mock.calls[0][2];
        expect(opts.secure).toBe(true);
        expect(opts.httpOnly).toBe(true);
        expect(opts.sameSite).toBe('strict');
        expect(opts.path).toBe('/api/auth');
        expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
      } finally {
        process.env.NODE_ENV = orig;
      }
    });

    it('sets secure:false when NODE_ENV=development at call time', () => {
      const orig = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const res = mockRes();
        setRefreshTokenCookie(res, 'tok', false);
        expect(res.cookie).toHaveBeenCalledOnce();
        const opts = res.cookie.mock.calls[0][2];
        expect(opts.secure).toBe(false);
        expect(opts.maxAge).toBeUndefined();
      } finally {
        process.env.NODE_ENV = orig;
      }
    });

    it('respects NODE_ENV changes between calls (lazy evaluation)', () => {
      const orig = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';
        const res1 = mockRes();
        setRefreshTokenCookie(res1, 'tok1', true);
        expect(res1.cookie.mock.calls[0][2].secure).toBe(false);

        process.env.NODE_ENV = 'production';
        const res2 = mockRes();
        setRefreshTokenCookie(res2, 'tok2', true);
        expect(res2.cookie.mock.calls[0][2].secure).toBe(true);
      } finally {
        process.env.NODE_ENV = orig;
      }
    });
  });

  describe('clearRefreshTokenCookie', () => {
    it('clears the dauth_rt cookie on /api/auth path', () => {
      const res = { clearCookie: vi.fn() } as unknown;
      clearRefreshTokenCookie(res);
      expect(res.clearCookie).toHaveBeenCalledWith('dauth_rt', { path: '/api/auth' });
    });
  });
});
