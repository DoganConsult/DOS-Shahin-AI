import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../identity/token.service', () => ({
  generateAccessToken: vi.fn(() => 'mock-access-token'),
  generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(),
  decodeTokenUnsafe: vi.fn(() => ({ jti: 'mock-jti', exp: 9999999999 })),
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
  getAccessTokenExpirySeconds: vi.fn(() => 3600),
}));

const mockBlacklistToken = vi.fn();
const mockIsTokenBlacklisted = vi.fn();
const mockRevokeAllUserTokens = vi.fn();
vi.mock('./token-blacklist.service', () => ({
  blacklistToken: (...args: unknown[]) => mockBlacklistToken(...args),
  isTokenBlacklisted: (...args: unknown[]) => mockIsTokenBlacklisted(...args),
  revokeAllUserTokens: (...args: unknown[]) => mockRevokeAllUserTokens(...args),
}));

vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: vi.fn(),
}));

import { createSession, refreshSession, destroySession, isSessionValid } from './session.service';
import { verifyRefreshToken } from '../identity/token.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockBlacklistToken.mockResolvedValue(undefined);
  mockIsTokenBlacklisted.mockResolvedValue(false);
  mockRevokeAllUserTokens.mockResolvedValue(undefined);
});

describe('DAuth SessionService', () => {
  describe('createSession', () => {
    it('returns accessToken, refreshToken, and expiresIn', () => {
      const result = createSession({
        userId: 'u-1',
        email: 'a@b.com',
        tenantId: 't-1',
        role: 'admin',
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(3600);
    });

    it('passes optional fields to payload', () => {
      const result = createSession({
        userId: 'u-1',
        email: 'a@b.com',
        tenantId: 't-1',
        role: 'admin',
        permissions: ['read'],
        roles: ['admin', 'viewer'],
        language: 'en',
        departmentId: 'd-1',
        name: 'Test User',
      });
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('handles rememberMe flag', () => {
      const result = createSession({
        userId: 'u-1',
        email: 'a@b.com',
        tenantId: 't-1',
        role: 'admin',
        rememberMe: false,
      });
      expect(result.refreshToken).toBe('mock-refresh-token');
    });
  });

  describe('refreshSession', () => {
    it('returns new tokens for valid refresh token with active user', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'u-1',
        tenantId: 't-1',
        jti: 'jti-old',
      } as Record<string, unknown>);
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'u-1', email: 'a@b.com', role: 'admin', tenant_id: 't-1', status: 'active' }],
      });
      const result = await refreshSession('valid-token');
      expect(result).not.toBeNull();
      expect(result!.accessToken).toBe('mock-access-token');
    });

    it('returns null when refresh token is invalid', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue(null as Record<string, unknown>);
      const result = await refreshSession('invalid-token');
      expect(result).toBeNull();
    });

    it('returns null when jti is blacklisted', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'u-1',
        tenantId: 't-1',
        jti: 'jti-blacklisted',
      } as Record<string, unknown>);
      mockIsTokenBlacklisted.mockResolvedValue(true);
      const result = await refreshSession('blacklisted-token');
      expect(result).toBeNull();
    });

    it('returns null when user not found', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'u-missing',
        tenantId: 't-1',
        jti: 'jti-1',
      } as Record<string, unknown>);
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await refreshSession('token-no-user');
      expect(result).toBeNull();
    });

    it('returns null when user status is not active', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({
        userId: 'u-1',
        tenantId: 't-1',
        jti: 'jti-1',
      } as Record<string, unknown>);
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'u-1', email: 'a@b.com', role: 'admin', tenant_id: 't-1', status: 'suspended' }],
      });
      const result = await refreshSession('suspended-user-token');
      expect(result).toBeNull();
    });
  });

  describe('destroySession', () => {
    it('blacklists jti and revokes all user tokens', async () => {
      await destroySession('u-1', 'jti-1');
      expect(mockBlacklistToken).toHaveBeenCalledWith('jti-1', 'u-1');
      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith('u-1');
    });

    it('skips jti blacklist when no jti provided', async () => {
      await destroySession('u-1');
      expect(mockBlacklistToken).not.toHaveBeenCalled();
      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith('u-1');
    });

    it('does not throw if blacklist fails', async () => {
      mockBlacklistToken.mockRejectedValue(new Error('DB error'));
      await expect(destroySession('u-1', 'jti-fail')).resolves.not.toThrow();
    });
  });

  describe('isSessionValid', () => {
    it('returns true when jti is not blacklisted', async () => {
      mockIsTokenBlacklisted.mockResolvedValue(false);
      expect(await isSessionValid('jti-clean')).toBe(true);
    });

    it('returns false when jti is blacklisted', async () => {
      mockIsTokenBlacklisted.mockResolvedValue(true);
      expect(await isSessionValid('jti-bad')).toBe(false);
    });
  });
});
