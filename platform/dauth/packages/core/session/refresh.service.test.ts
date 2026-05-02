import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  createRefreshFamily,
  rotateRefreshToken,
  revokeRefreshFamily,
  revokeAllFamiliesForUser,
  getActiveFamily,
  detectReplayAttack,
  cleanupExpiredFamilies,
} from './refresh.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DAuth RefreshService', () => {
  describe('createRefreshFamily', () => {
    it('inserts a new family and returns the record', async () => {
      const expires = new Date(Date.now() + 86400_000);
      const family = await createRefreshFamily('u-1', 't-1', 'jti-1', expires);
      expect(family.userId).toBe('u-1');
      expect(family.tenantId).toBe('t-1');
      expect(family.currentJti).toBe('jti-1');
      expect(family.rotationCount).toBe(0);
      expect(family.status).toBe('active');
      expect(family.familyId).toBeTruthy();
    });

    it('inserts into refresh_token_families table', async () => {
      const expires = new Date(Date.now() + 86400_000);
      await createRefreshFamily('u-1', 't-1', 'jti-1', expires);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO refresh_token_families');
      expect(params[1]).toBe('u-1');
      expect(params[2]).toBe('t-1');
      expect(params[3]).toBe('jti-1');
    });

    it('propagates DB errors', async () => {
      mockQuery.mockRejectedValue(new Error('unique violation'));
      const expires = new Date();
      await expect(createRefreshFamily('u-1', 't-1', 'jti-dup', expires)).rejects.toThrow('unique violation');
    });
  });

  describe('rotateRefreshToken', () => {
    it('returns true when rotation succeeds', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });
      const result = await rotateRefreshToken('fam-1', 'old-jti', 'new-jti');
      expect(result).toBe(true);
    });

    it('returns false when family not found or jti mismatch', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });
      const result = await rotateRefreshToken('fam-missing', 'wrong-jti', 'new-jti');
      expect(result).toBe(false);
    });

    it('updates with correct parameters', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });
      await rotateRefreshToken('fam-1', 'old-jti', 'new-jti');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('UPDATE refresh_token_families');
      expect(params[0]).toBe('new-jti');
      expect(params[1]).toBe('fam-1');
      expect(params[2]).toBe('old-jti');
    });
  });

  describe('revokeRefreshFamily', () => {
    it('sets status to revoked', async () => {
      await revokeRefreshFamily('fam-1');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("status = 'revoked'");
      expect(params[0]).toBe('fam-1');
    });

    it('does not throw when family does not exist', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });
      await expect(revokeRefreshFamily('fam-missing')).resolves.not.toThrow();
    });
  });

  describe('revokeAllFamiliesForUser', () => {
    it('returns count of revoked families', async () => {
      mockQuery.mockResolvedValue({ rowCount: 3 });
      const count = await revokeAllFamiliesForUser('u-1');
      expect(count).toBe(3);
    });

    it('returns 0 when user has no active families', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });
      const count = await revokeAllFamiliesForUser('u-empty');
      expect(count).toBe(0);
    });

    it('filters by active status and user_id', async () => {
      await revokeAllFamiliesForUser('u-1');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("status = 'active'");
      expect(params[0]).toBe('u-1');
    });
  });

  describe('getActiveFamily', () => {
    it('returns mapped family for active non-expired record', async () => {
      const now = new Date();
      const expires = new Date(Date.now() + 86400_000);
      mockQuery.mockResolvedValue({
        rows: [{
          family_id: 'fam-1',
          user_id: 'u-1',
          tenant_id: 't-1',
          current_jti: 'jti-current',
          rotation_count: 2,
          status: 'active',
          created_at: now,
          expires_at: expires,
        }],
      });
      const family = await getActiveFamily('fam-1');
      expect(family).not.toBeNull();
      expect(family!.familyId).toBe('fam-1');
      expect(family!.currentJti).toBe('jti-current');
      expect(family!.rotationCount).toBe(2);
    });

    it('returns null when family not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const family = await getActiveFamily('fam-missing');
      expect(family).toBeNull();
    });

    it('queries with correct familyId', async () => {
      await getActiveFamily('fam-42');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("status = 'active'");
      expect(sql).toContain('expires_at > NOW()');
      expect(params[0]).toBe('fam-42');
    });
  });

  describe('detectReplayAttack', () => {
    it('returns false when family not found (no active family)', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const isReplay = await detectReplayAttack('fam-missing', 'any-jti');
      expect(isReplay).toBe(false);
    });

    it('returns false when presented jti matches current jti', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          family_id: 'fam-1', user_id: 'u-1', tenant_id: 't-1',
          current_jti: 'jti-current', rotation_count: 0, status: 'active',
          created_at: new Date(), expires_at: new Date(Date.now() + 86400_000),
        }],
      });
      const isReplay = await detectReplayAttack('fam-1', 'jti-current');
      expect(isReplay).toBe(false);
    });

    it('returns true when presented jti differs from current jti (replay)', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          family_id: 'fam-1', user_id: 'u-1', tenant_id: 't-1',
          current_jti: 'jti-new', rotation_count: 1, status: 'active',
          created_at: new Date(), expires_at: new Date(Date.now() + 86400_000),
        }],
      });
      const isReplay = await detectReplayAttack('fam-1', 'jti-old');
      expect(isReplay).toBe(true);
    });
  });

  describe('cleanupExpiredFamilies', () => {
    it('returns count of deleted families', async () => {
      mockQuery.mockResolvedValue({ rowCount: 10 });
      const count = await cleanupExpiredFamilies();
      expect(count).toBe(10);
    });

    it('returns 0 when nothing to clean', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });
      const count = await cleanupExpiredFamilies();
      expect(count).toBe(0);
    });

    it('deletes expired and revoked families', async () => {
      await cleanupExpiredFamilies();
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('DELETE FROM refresh_token_families');
      expect(sql).toContain('expires_at < NOW()');
      expect(sql).toContain("status = 'revoked'");
    });
  });
});
