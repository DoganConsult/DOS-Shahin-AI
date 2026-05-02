import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
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
vi.mock('../../../../errors/index', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(type: string, id: string) { super(`${type} ${id} not found`); }
  },
  ValidationError: class ValidationError extends Error {
    constructor(public errors: unknown[]) { super(errors[0]?.message ?? 'Validation error'); }
  },
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../platform/dos/workflows', () => ({
  emitWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../integration/lifecycle-bridge.service', () => ({
  canPerformWorkflowAction: vi.fn().mockResolvedValue(true),
}));

import {
  escalateStep,
  resolveEscalation,
  getEscalationsForExecution,
  getPendingEscalations,
  processAutoEscalations,
} from './workflow-escalation.service';
import { safeQuery } from '../../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
describe('Workflow Escalation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('escalateStep', () => {
    it('should throw NotFoundError when step is not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(escalateStep('t1', 'inst-1', 'step-1', 'overdue', 'u1')).rejects.toThrow('not found');
    });

    it('should escalate to next level and return escalation record', async () => {
      // Step query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_step_id: 'is-1', status: 'active', step_code: 'review',
          config: {}, workflow_id: 'wf-1', module_code: 'risk',
        }],
      });
      // Current escalation level query
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ level: 0 }] });
      // Insert escalation
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Update execution status
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await escalateStep('t1', 'inst-1', 'step-1', 'SLA overdue', 'u1');
      expect(result.escalationLevel).toBe(1);
      expect(result.escalatedTo).toBe('module_lead');
      expect(result.reason).toBe('SLA overdue');
      expect(result.status).toBe('pending');
    });

    it('should throw ValidationError when max escalation level reached', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_step_id: 'is-1', status: 'active', step_code: 'review',
          config: {}, workflow_id: 'wf-1', module_code: 'risk',
        }],
      });
      // Current level is already 3 (max)
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ level: 3 }] });

      await expect(escalateStep('t1', 'inst-1', 'step-1', 'overdue', 'u1')).rejects.toThrow('Maximum escalation level');
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve a pending escalation', async () => {
      const mockEscRow = {
        escalation_id: 'esc-1', instance_id: 'inst-1', step_id: 'step-1',
        step_code: 'review', escalation_level: 1, escalated_to: 'module_lead',
        reason: 'overdue', status: 'resolved', resolved_by: 'u2',
        resolved_at: '2026-04-04T12:00:00Z', created_at: '2026-04-04T08:00:00Z',
      };
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockEscRow] });
      // Update execution status back to running
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await resolveEscalation('t1', 'esc-1', 'resolved', 'u2', 'Fixed the issue');
      expect(result.status).toBe('resolved');
      expect(result.resolvedBy).toBe('u2');
    });

    it('should throw NotFoundError for non-existent escalation', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(resolveEscalation('t1', 'esc-x', 'resolved', 'u1')).rejects.toThrow('not found');
    });
  });

  describe('getEscalationsForExecution', () => {
    it('should return escalation records for an execution', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          escalation_id: 'esc-1', instance_id: 'inst-1', step_id: 'step-1',
          step_code: 'review', escalation_level: 1, escalated_to: 'module_lead',
          reason: 'overdue', status: 'pending', created_at: '2026-04-04T08:00:00Z',
          resolved_at: null, resolved_by: null,
        }],
      });

      const result = await getEscalationsForExecution('t1', 'inst-1');
      expect(result).toHaveLength(1);
      expect(result[0].escalationId).toBe('esc-1');
    });

    it('should return empty array on failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await getEscalationsForExecution('t1', 'inst-1');
      expect(result).toEqual([]);
    });
  });

  describe('getPendingEscalations', () => {
    it('should return pending escalations', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          escalation_id: 'esc-2', instance_id: 'inst-2', step_id: 'step-2',
          step_code: 'approval', escalation_level: 2, escalated_to: 'approver',
          reason: 'SLA breach', status: 'pending', created_at: '2026-04-04T00:00:00Z',
          resolved_at: null, resolved_by: null,
        }],
      });

      const result = await getPendingEscalations('t1');
      expect(result).toHaveLength(1);
      expect(result[0].escalationLevel).toBe(2);
    });
  });

  describe('processAutoEscalations', () => {
    it('should process overdue steps and return counts', async () => {
      // Overdue steps query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_id: 'inst-1', step_id: 'step-1', step_code: 'review',
          sla_hours: 8, module_code: 'risk', current_level: 0,
        }],
      });
      // escalateStep internal queries: step lookup
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{
          instance_step_id: 'is-1', status: 'active', step_code: 'review',
          config: {}, workflow_id: 'wf-1', module_code: 'risk',
        }],
      });
      // Current escalation level
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ level: 0 }] });
      // Insert escalation
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Update execution
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await processAutoEscalations('t1');
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle empty overdue list gracefully', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await processAutoEscalations('t1');
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
    });
  });
});
