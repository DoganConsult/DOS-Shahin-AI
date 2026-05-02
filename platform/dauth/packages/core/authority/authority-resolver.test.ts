import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import { getUserAuthorityLevel, hasAuthority } from './authority-resolver';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [] });
});

describe('DAuth AuthorityResolver', () => {
  describe('getUserAuthorityLevel', () => {
    it('returns null when no authority assignment', async () => {
      expect(await getUserAuthorityLevel('t1', 'u-001')).toBeNull();
    });

    it('returns level when found', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ level_code: 'approve_high', rank: 5 }] });
      const level = await getUserAuthorityLevel('t1', 'u-001');
      expect(level).toEqual({ levelCode: 'approve_high', rank: 5 });
    });
  });

  describe('hasAuthority', () => {
    it('returns false when user has no authority', async () => {
      expect(await hasAuthority('t1', 'u-001', 'approve_high')).toBe(false);
    });

    it('returns true when user rank >= required rank', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('user_role_assignments')) return { rows: [{ level_code: 'approve_high', rank: 5 }] };
        if (sql.includes('WHERE level_code')) return { rows: [{ rank: 3 }] };
        return { rows: [] };
      });
      expect(await hasAuthority('t1', 'u-001', 'approve_low')).toBe(true);
    });

    it('returns false when user rank < required rank', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('user_role_assignments')) return { rows: [{ level_code: 'approve_low', rank: 2 }] };
        if (sql.includes('WHERE level_code')) return { rows: [{ rank: 5 }] };
        return { rows: [] };
      });
      expect(await hasAuthority('t1', 'u-001', 'approve_high')).toBe(false);
    });
  });
});
