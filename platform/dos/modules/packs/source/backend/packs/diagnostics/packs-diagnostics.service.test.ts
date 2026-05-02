/**
 * Packs Diagnostics -- Unit Tests
 *
 * MP-36 Section 12.1: PacksDiagnosticsService tests.
 * Tests health checks, metrics computation, and dependency diagnostics.
 *
 * @owner DOS
 * @module packs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

import { runDiagnostics, getPacksMetrics, getDependencyDiagnostics } from './packs-diagnostics.service';

describe('PacksDiagnosticsService', () => {
  beforeEach(() => {
    mockSafeQuery.mockReset();
    mockSafeQuery.mockResolvedValue({ rows: [{ cnt: 0 }] });
  });

  describe('runDiagnostics', () => {
    it('returns healthy when all checks pass', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })  // schema exists
        .mockResolvedValueOnce({ rows: [                         // tables exist
          { table_name: 'pack_installations' },
          { table_name: 'pack_registry' },
          { table_name: 'pack_policies' },
        ] })
        .mockResolvedValueOnce({ rows: [{ cnt: 10 }] })          // registry has packs
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })           // no failed
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })           // no outdated
        .mockResolvedValueOnce({ rows: [] })                      // installed packs (for dep check)
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });          // no stale

      const result = await runDiagnostics('test-tenant');

      expect(result.moduleCode).toBe('packs');
      expect(result.healthy).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.checkedAt).toBeTruthy();
    });

    it('returns unhealthy when schema is missing', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // schema missing

      const result = await runDiagnostics('missing-tenant');

      expect(result.checks.find(c => c.name === 'schema_exists')?.passed).toBe(false);
    });

    it('reports missing owned tables', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })  // schema exists
        .mockResolvedValueOnce({ rows: [                         // only 1 of 3 tables
          { table_name: 'pack_installations' },
        ] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const result = await runDiagnostics('partial-tenant');

      const installTable = result.checks.find(c => c.name === 'table_pack_installations');
      const registryTable = result.checks.find(c => c.name === 'table_pack_registry');

      expect(installTable?.passed).toBe(true);
      expect(registryTable?.passed).toBe(false);
    });

    it('detects failed installations', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 5 }] })
        .mockResolvedValueOnce({ rows: [{ cnt: 3 }] })   // 3 failed installations
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const result = await runDiagnostics('failed-tenant');

      const failedCheck = result.checks.find(c => c.name === 'no_failed_installations');
      expect(failedCheck?.passed).toBe(false);
      expect(failedCheck?.detail).toContain('3');
    });

    it('detects outdated packs', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 5 }] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
        .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })   // 2 outdated packs
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const result = await runDiagnostics('outdated-tenant');

      const outdatedCheck = result.checks.find(c => c.name === 'no_outdated_packs');
      expect(outdatedCheck?.passed).toBe(false);
      expect(outdatedCheck?.detail).toContain('2');
    });

    it('handles database errors gracefully', async () => {
      mockSafeQuery.mockRejectedValue(new Error('Connection refused'));

      const result = await runDiagnostics('error-tenant');

      // Should not throw -- returns result with failed checks
      expect(result.moduleCode).toBe('packs');
    });
  });

  describe('getPacksMetrics', () => {
    it('returns correct metrics structure', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ cnt: 8 }] })     // installed
        .mockResolvedValueOnce({ rows: [{ cnt: 20 }] })    // available
        .mockResolvedValueOnce({ rows: [{ cnt: 1 }] })     // failed
        .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })     // outdated
        .mockResolvedValueOnce({ rows: [{ last_install: '2026-03-30T00:00:00Z' }] }) // last install
        .mockResolvedValueOnce({ rows: [{ cnt: 10 }] });   // total

      const metrics = await getPacksMetrics('test-tenant');

      expect(metrics.totalInstalled).toBe(8);
      expect(metrics.totalAvailable).toBe(20);
      expect(metrics.failedInstallations).toBe(1);
      expect(metrics.outdatedPacks).toBe(2);
      expect(metrics.lastInstallDate).toBe('2026-03-30T00:00:00Z');
      expect(metrics.installSuccessRate).toBe(90); // (10-1)/10 = 90%
    });

    it('returns 100% success rate when no installations', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ cnt: 0, last_install: null }] });

      const metrics = await getPacksMetrics('empty-tenant');

      expect(metrics.totalInstalled).toBe(0);
      expect(metrics.installSuccessRate).toBe(100);
    });
  });

  describe('getDependencyDiagnostics', () => {
    it('returns empty when no packs installed', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no installed packs

      const result = await getDependencyDiagnostics('empty-tenant');

      expect(result.packsWithMissingDeps).toEqual([]);
    });

    it('detects missing dependencies', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [                    // installed packs
          { pack_code: 'pack-a' },
          { pack_code: 'pack-b' },
        ] })
        .mockResolvedValueOnce({ rows: [                    // pack dependencies
          { code: 'pack-a', depends_on: ['pack-c'] },       // pack-c is missing
          { code: 'pack-b', depends_on: ['pack-a'] },       // pack-a is installed
        ] });

      const result = await getDependencyDiagnostics('dep-tenant');

      expect(result.packsWithMissingDeps.length).toBe(1);
      expect(result.packsWithMissingDeps[0].packCode).toBe('pack-a');
      expect(result.packsWithMissingDeps[0].missingDeps).toContain('pack-c');
    });

    it('returns empty when all dependencies met', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [
          { pack_code: 'pack-a' },
          { pack_code: 'pack-b' },
        ] })
        .mockResolvedValueOnce({ rows: [
          { code: 'pack-a', depends_on: ['pack-b'] },
          { code: 'pack-b', depends_on: [] },
        ] });

      const result = await getDependencyDiagnostics('ok-tenant');

      expect(result.packsWithMissingDeps).toEqual([]);
    });
  });
});
