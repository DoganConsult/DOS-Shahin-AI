import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import {
  blacklistToken,
  isTokenBlacklisted,
  registerActiveJtiForUser,
  removeActiveJtiForUser,
  revokeAllUserTokens,
} from './token-blacklist.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('DAuth TokenBlacklistService', () => {
  describe('blacklistToken', () => {
    it('inserts jti with default TTL', async () => {
      await blacklistToken('jti-001');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO token_blacklist');
      expect(params[0]).toBe('jti-001');
      expect(params[1]).toBeNull();
    });

    it('accepts userId + custom TTL', async () => {
      await blacklistToken('jti-002', 'u-001', 3600);
      const [, params] = mockQuery.mock.calls[0];
      expect(params[0]).toBe('jti-002');
      expect(params[1]).toBe('u-001');
    });

    it('accepts numeric TTL without userId', async () => {
      await blacklistToken('jti-003', 7200);
      const [, params] = mockQuery.mock.calls[0];
      expect(params[0]).toBe('jti-003');
      expect(params[1]).toBeNull();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('returns false when not blacklisted', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await isTokenBlacklisted('jti-clean')).toBe(false);
    });

    it('returns true when blacklisted', async () => {
      mockQuery.mockResolvedValue({ rows: [{ jti: 'jti-bad' }] });
      expect(await isTokenBlacklisted('jti-bad')).toBe(true);
    });
  });

  describe('registerActiveJtiForUser', () => {
    it('upserts active JTI', async () => {
      await registerActiveJtiForUser('u-001', 'jti-active', 3600);
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('is_active');
      expect(sql).toContain('ON CONFLICT');
    });
  });

  describe('removeActiveJtiForUser', () => {
    it('marks JTI inactive', async () => {
      await removeActiveJtiForUser('u-001', 'jti-active');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('is_active = FALSE');
      expect(params).toContain('jti-active');
      expect(params).toContain('u-001');
    });
  });

  describe('revokeAllUserTokens', () => {
    it('deactivates all user tokens', async () => {
      await revokeAllUserTokens('u-001');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('is_active = FALSE');
      expect(params).toContain('u-001');
    });
  });
});
