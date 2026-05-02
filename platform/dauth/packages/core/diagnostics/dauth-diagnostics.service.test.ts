import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { runDauthDiagnostics, getDauthHealthSummary } from './dauth-diagnostics.service';

describe('DAuth Diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runDauthDiagnostics', () => {
    it('returns zeroed result when all queries return 0', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const result = await runDauthDiagnostics('t-001');
      expect(result.tenantId).toBe('t-001');
      expect(result.expiredDelegations).toBe(0);
      expect(result.orphanedSessions).toBe(0);
      expect(result.lockedAccounts).toBe(0);
    });

    it('degrades gracefully when queries fail', async () => {
      mockSafeQuery.mockRejectedValue(new Error('table not found'));

      const result = await runDauthDiagnostics('t-001');
      expect(result.expiredDelegations).toBe(0);
      expect(result.orphanedSessions).toBe(0);
      expect(result.lockedAccounts).toBe(0);
    });

    it('reports non-zero counts from successful queries', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: '5' }] })   // expired delegations
        .mockResolvedValueOnce({ rows: [{ cnt: '3' }] })   // orphaned sessions
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })   // sod violations
        .mockResolvedValueOnce({ rows: [{ cnt: '2' }] })   // locked accounts
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })   // pending reviews
        .mockResolvedValueOnce({ rows: [{ cnt: '1' }] })   // stale invitations
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })   // users without roles
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });  // expired assignments

      const result = await runDauthDiagnostics('t-001');
      expect(result.expiredDelegations).toBe(5);
      expect(result.orphanedSessions).toBe(3);
      expect(result.lockedAccounts).toBe(2);
      expect(result.staleInvitations).toBe(1);
    });
  });

  describe('getDauthHealthSummary', () => {
    it('returns healthy when no issues', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const summary = await getDauthHealthSummary('t-001');
      expect(summary.healthy).toBe(true);
      expect(summary.score).toBe(100);
      expect(summary.issues).toHaveLength(0);
    });

    it('returns unhealthy with issues listed', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: '3' }] })   // expired delegations
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '1' }] })   // locked accounts
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

      const summary = await getDauthHealthSummary('t-001');
      expect(summary.healthy).toBe(false);
      expect(summary.issues.length).toBeGreaterThan(0);
      expect(summary.score).toBeLessThan(100);
    });
  });
});
