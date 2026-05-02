import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../platform/dos/workflows', () => ({
  emitWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../platform/dos/constants/system-actors', () => ({
  SYSTEM_JOB_ACTOR: 'system',
}));

import {
  getSlaStatusForExecution,
  getBreachedSlaTimers,
  getWarningSlaTimers,
  processSlaBreach,
  emitSlaWarning,
  getSlaMetrics,
} from './workflow-sla.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { emitWorkflowEvent } from '../../ports/lifecycle.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
describe('Workflow SLA Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSlaStatusForExecution', () => {
    it('should return SLA status for each step in execution', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          {
            instance_id: 'inst-1', step_id: 'step-1', step_code: 'review',
            sla_hours: '24', due_at: '2026-04-05T00:00:00Z', step_status: 'active',
            is_breached: false, is_warning: false, hours_remaining: '12.5',
          },
        ],
      });

      const result = await getSlaStatusForExecution('t1', 'inst-1');
      expect(result).toHaveLength(1);
      expect(result[0].stepCode).toBe('review');
      expect(result[0].slaHours).toBe(24);
      expect(result[0].hoursRemaining).toBe(12.5);
      expect(result[0].isBreached).toBe(false);
    });

    it('should return empty array on query failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await getSlaStatusForExecution('t1', 'inst-1');
      expect(result).toEqual([]);
    });

    it('should handle null sla_hours gracefully', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          {
            instance_id: 'inst-1', step_id: 'step-1', step_code: 'task',
            sla_hours: null, due_at: null, step_status: 'active',
            is_breached: false, is_warning: false, hours_remaining: null,
          },
        ],
      });

      const result = await getSlaStatusForExecution('t1', 'inst-1');
      expect(result[0].slaHours).toBeNull();
      expect(result[0].hoursRemaining).toBeNull();
    });
  });

  describe('getBreachedSlaTimers', () => {
    it('should return breached timer records', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          timer_id: 'timer-1', instance_id: 'inst-1', step_id: 'step-1',
          step_code: 'review', sla_hours: '8', started_at: '2026-04-04T00:00:00Z',
          due_at: '2026-04-04T08:00:00Z', status: 'breached', breached_at: '2026-04-04T09:00:00Z',
        }],
      });

      const result = await getBreachedSlaTimers('t1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('breached');
      expect(result[0].slaHours).toBe(8);
    });

    it('should return empty array on failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await getBreachedSlaTimers('t1');
      expect(result).toEqual([]);
    });
  });

  describe('getWarningSlaTimers', () => {
    it('should return warning timer records', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          timer_id: 'timer-2', instance_id: 'inst-2', step_id: 'step-2',
          step_code: 'approval', sla_hours: '24', started_at: '2026-04-03T00:00:00Z',
          due_at: '2026-04-04T00:00:00Z', status: 'active', breached_at: null,
        }],
      });

      const result = await getWarningSlaTimers('t1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
    });
  });

  describe('processSlaBreach', () => {
    it('should process breach and return escalation result', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ step_code: 'review', sla_hours: 8, config: {}, workflow_id: 'wf-1', module_code: 'risk' }],
      });

      const result = await processSlaBreach('t1', 'inst-1', 'step-1');
      expect(result.escalated).toBe(true);
      expect(result.action).toBe('sla_breach_recorded');
    });

    it('should return not escalated when step not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await processSlaBreach('t1', 'inst-1', 'step-x');
      expect(result.escalated).toBe(false);
      expect(result.action).toBe('step_not_found');
    });

    it('should return error on query failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await processSlaBreach('t1', 'inst-1', 'step-1');
      expect(result.escalated).toBe(false);
      expect(result.action).toBe('error');
    });
  });

  describe('emitSlaWarning', () => {
    it('should emit warning event without throwing', async () => {
      await expect(emitSlaWarning('t1', 'inst-1', 'step-1')).resolves.not.toThrow();
      expect(emitWorkflowEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSlaMetrics', () => {
    it('should return aggregated SLA metrics', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          total_active: 10, total_breached: 2, total_warning: 3, avg_breach_hours: '5.5',
        }],
      });

      const result = await getSlaMetrics('t1');
      expect(result.totalActive).toBe(10);
      expect(result.totalBreached).toBe(2);
      expect(result.totalWarning).toBe(3);
      expect(result.averageBreachHours).toBe(5.5);
    });

    it('should return zeros on failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await getSlaMetrics('t1');
      expect(result.totalActive).toBe(0);
      expect(result.totalBreached).toBe(0);
    });
  });
});
