import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../../../platform/dos/workflows/engine/workflow-engine.service', () => ({
  advanceStep: vi.fn().mockResolvedValue(undefined),
}));

import { recoverStalledInstances, runStallRecoveryForAllTenants } from './workflow-stall-recovery.service';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { logger } from '../../ports/logger.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
describe('Workflow Stall Recovery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recoverStalledInstances', () => {
    it('should return zero counts when no stalled instances', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await recoverStalledInstances('t1');
      expect(result.recovered).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should recover stalled instances by advancing their step', async () => {
      // Find stalled instances
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_id: 'inst-1', workflow_id: 'wf-1',
          current_step_id: 'step-1', status: 'in_progress',
          updated_at: '2026-04-04T00:00:00Z',
        }],
      });
      // Log recovery event
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await recoverStalledInstances('t1');
      expect(result.recovered).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should count failures when advance step throws', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_id: 'inst-2', workflow_id: 'wf-1',
          current_step_id: 'step-2', status: 'in_progress',
          updated_at: '2026-04-04T00:00:00Z',
        }],
      });

      // Dynamic import mock - make advanceStep throw
      const engineMod = await import('@dos/platform-core/workflows/engine/workflow-engine.service');
      (engineMod.advanceStep as any).mockRejectedValueOnce(new Error('Step not advanceable'));
      // Log recovery_failed event
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await recoverStalledInstances('t1');
      expect(result.failed).toBe(1);
    });

    it('should handle DB errors gracefully', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('Connection refused'));
      const result = await recoverStalledInstances('t1');
      expect(result.recovered).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('runStallRecoveryForAllTenants', () => {
    it('should iterate over all active tenants', async () => {
      // Get active tenants
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ tenant_id: 't1' }, { tenant_id: 't2' }],
      });
      // Each tenant: no stalled instances
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      await runStallRecoveryForAllTenants();
      // No error thrown, tenants queried
      expect(safeQuery).toHaveBeenCalledTimes(3);
    });

    it('should handle tenant query failure gracefully', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB down'));
      await expect(runStallRecoveryForAllTenants()).resolves.not.toThrow();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log summary when recoveries occur', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ tenant_id: 't1' }] });
      // One stalled instance
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_id: 'inst-1', workflow_id: 'wf-1',
          current_step_id: 'step-1', status: 'in_progress',
          updated_at: '2026-04-04T00:00:00Z',
        }],
      });
      // Recovery event log
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      await runStallRecoveryForAllTenants();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cycle complete'),
      );
    });
  });
});
