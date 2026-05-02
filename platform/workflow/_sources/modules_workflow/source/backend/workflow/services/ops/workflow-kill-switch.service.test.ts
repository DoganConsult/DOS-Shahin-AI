import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../notification/services/notification.service', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  activateKillSwitch,
  deactivateKillSwitch,
  getActiveKillSwitches,
  isKillSwitchActive,
  logIntervention,
  getInterventionLog as _getInterventionLog,
  acknowledgeIntervention,
} from './workflow-kill-switch.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { createNotification } from '../../../notification/services/notification.service';

const mockSwitchRow = {
  switch_id: 'ks-1',
  tenant_id: 't1',
  activated_by: 'admin-1',
  scope: 'all_autonomous',
  scope_filter: '{}',
  reason: 'Emergency halt',
  is_active: true,
  activated_at: '2026-04-04T00:00:00Z',
  deactivated_at: null,
  deactivated_by: null,
};

describe('Workflow Kill Switch Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('activateKillSwitch', () => {
    it('should activate a kill switch and return record', async () => {
      // Insert kill switch
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockSwitchRow] });
      // Log intervention insert
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ intervention_id: 'int-1' }] });

      const result = await activateKillSwitch('t1', 'admin-1', {
        scope: 'all_autonomous',
        reason: 'Emergency halt',
      });

      expect(result.switch_id).toBe('ks-1');
      expect(result.is_active).toBe(true);
      expect(result.scope).toBe('all_autonomous');
    });

    it('should notify specified users', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockSwitchRow] });
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ intervention_id: 'int-1' }] });

      await activateKillSwitch('t1', 'admin-1', {
        scope: 'all_autonomous',
        reason: 'Emergency',
        notifyUsers: ['user-1', 'user-2'],
      });

      expect(createNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('deactivateKillSwitch', () => {
    it('should deactivate an active kill switch', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockSwitchRow, is_active: false, deactivated_at: '2026-04-04T12:00:00Z', deactivated_by: 'admin-2' }],
      });

      const result = await deactivateKillSwitch('t1', 'ks-1', 'admin-2');
      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
      expect(result!.deactivated_by).toBe('admin-2');
    });

    it('should return null when switch not found or already inactive', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await deactivateKillSwitch('t1', 'ks-x', 'admin-1');
      expect(result).toBeNull();
    });
  });

  describe('getActiveKillSwitches', () => {
    it('should return all active kill switches for a tenant', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockSwitchRow] });
      const result = await getActiveKillSwitches('t1');
      expect(result).toHaveLength(1);
      expect(result[0].is_active).toBe(true);
    });
  });

  describe('isKillSwitchActive', () => {
    it('should return blocked=true when all_autonomous switch is active', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockSwitchRow] });
      const result = await isKillSwitchActive('t1');
      expect(result.blocked).toBe(true);
      expect(result.switches).toHaveLength(1);
    });

    it('should return blocked=false when no active switches', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await isKillSwitchActive('t1');
      expect(result.blocked).toBe(false);
    });

    it('should match workflow_specific scope by workflowId', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          ...mockSwitchRow,
          scope: 'workflow_specific',
          scope_filter: { workflowId: 'wf-1' },
        }],
      });

      const result = await isKillSwitchActive('t1', { workflowId: 'wf-1' });
      expect(result.blocked).toBe(true);
    });

    it('should not match workflow_specific scope with different workflowId', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          ...mockSwitchRow,
          scope: 'workflow_specific',
          scope_filter: { workflowId: 'wf-1' },
        }],
      });

      const result = await isKillSwitchActive('t1', { workflowId: 'wf-2' });
      expect(result.blocked).toBe(false);
    });

    it('should match module_specific scope', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          ...mockSwitchRow,
          scope: 'module_specific',
          scope_filter: { moduleCode: 'risk' },
        }],
      });

      const result = await isKillSwitchActive('t1', { moduleCode: 'risk' });
      expect(result.blocked).toBe(true);
    });
  });

  describe('logIntervention', () => {
    it('should log intervention and return ID', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ intervention_id: 'int-1' }] });
      const result = await logIntervention('t1', {
        interventionType: 'manual_override',
        details: { reason: 'test' },
      });
      expect(result).toBe('int-1');
    });
  });

  describe('acknowledgeIntervention', () => {
    it('should return true when intervention is acknowledged', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 1 });
      const result = await acknowledgeIntervention('t1', 'int-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when intervention already acknowledged', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 0 });
      const result = await acknowledgeIntervention('t1', 'int-1', 'user-1');
      expect(result).toBe(false);
    });
  });
});
