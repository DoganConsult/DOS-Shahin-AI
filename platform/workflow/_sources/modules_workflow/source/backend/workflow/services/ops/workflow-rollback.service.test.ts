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
vi.mock('../../../../platform/dos/workflows', () => ({
  emitWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getCompensatingAction,
  initiateRollback,
  executeRollback,
  getRollbacksByInstance,
  getPendingRollbacks,
} from './workflow-rollback.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

const mockRollbackRow = {
  rollback_id: 'rb-1',
  instance_id: 'inst-1',
  step_id: 'step-1',
  original_action_id: 'action-1',
  original_action_type: 'task_create',
  original_state: JSON.stringify({ title: 'Original task' }),
  compensating_action_type: 'task_cancel',
  compensating_state: '{}',
  rollback_reason: 'AI error',
  rollback_status: 'pending',
  initiated_by: 'user-1',
  completed_at: null,
  created_at: '2026-04-04T00:00:00Z',
};

describe('Workflow Rollback Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCompensatingAction', () => {
    it('should return compensating action for task_create', () => {
      expect(getCompensatingAction('task_create')).toBe('task_cancel');
    });

    it('should return compensating action for task_assign', () => {
      expect(getCompensatingAction('task_assign')).toBe('task_unassign');
    });

    it('should return compensating action for risk_score_auto', () => {
      expect(getCompensatingAction('risk_score_auto')).toBe('risk_score_revert');
    });

    it('should return compensating action for evidence_auto_validate', () => {
      expect(getCompensatingAction('evidence_auto_validate')).toBe('evidence_invalidate');
    });

    it('should return compensating action for incident_auto_triage', () => {
      expect(getCompensatingAction('incident_auto_triage')).toBe('incident_retriage');
    });

    it('should return null for unknown action', () => {
      expect(getCompensatingAction('unknown_action')).toBeNull();
    });

    it('should return compensating action for notification_send', () => {
      expect(getCompensatingAction('notification_send')).toBe('notification_retract');
    });

    it('should return compensating action for escalation_trigger', () => {
      expect(getCompensatingAction('escalation_trigger')).toBe('escalation_cancel');
    });

    it('should return compensating action for vendor_auto_score', () => {
      expect(getCompensatingAction('vendor_auto_score')).toBe('vendor_score_revert');
    });

    it('should return compensating action for remediation_auto_plan', () => {
      expect(getCompensatingAction('remediation_auto_plan')).toBe('remediation_plan_revert');
    });
  });

  describe('initiateRollback', () => {
    it('should create a rollback record with compensating action', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockRollbackRow] });

      const result = await initiateRollback('t1', 'user-1', {
        instanceId: 'inst-1',
        stepId: 'step-1',
        originalActionId: 'action-1',
        originalActionType: 'task_create',
        originalState: { title: 'Original task' },
        reason: 'AI error',
      });

      expect(result.rollback_id).toBe('rb-1');
      expect(result.compensating_action_type).toBe('task_cancel');
      expect(result.rollback_status).toBe('pending');
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', entityType: 'workflow_rollback' }),
      );
    });

    it('should set compensating_action_type to null for unknown action', async () => {
      const rowWithNull = { ...mockRollbackRow, original_action_type: 'unknown', compensating_action_type: null };
      (safeQuery as any).mockResolvedValueOnce({ rows: [rowWithNull] });

      const result = await initiateRollback('t1', 'user-1', {
        instanceId: 'inst-1',
        originalActionType: 'unknown',
        originalState: {},
        reason: 'Test',
      });

      expect(result.compensating_action_type).toBeNull();
    });
  });

  describe('executeRollback', () => {
    it('should execute rollback and mark as completed', async () => {
      // Set to in_progress
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 1 });
      // Update to completed
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRollbackRow, rollback_status: 'completed', completed_at: '2026-04-04T12:00:00Z', compensating_state: '{"reverted":true}' }],
      });

      const result = await executeRollback('t1', 'rb-1', 'user-1', { reverted: true });
      expect(result).not.toBeNull();
      expect(result!.rollback_status).toBe('completed');
    });

    it('should return null when rollback ID not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 0 });
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await executeRollback('t1', 'rb-x', 'user-1', {});
      expect(result).toBeNull();
    });

    it('should mark as failed and re-throw on DB error during completion', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 1 });
      (safeQuery as any).mockRejectedValueOnce(new Error('DB write failure'));
      // Mark as failed
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 1 });

      await expect(executeRollback('t1', 'rb-1', 'user-1', {})).rejects.toThrow('DB write failure');
    });
  });

  describe('getRollbacksByInstance', () => {
    it('should return rollback history for an instance', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [mockRollbackRow, { ...mockRollbackRow, rollback_id: 'rb-2', rollback_status: 'completed' }],
      });

      const result = await getRollbacksByInstance('t1', 'inst-1');
      expect(result).toHaveLength(2);
      expect(result[0].rollback_id).toBe('rb-1');
    });
  });

  describe('getPendingRollbacks', () => {
    it('should return pending and in_progress rollbacks', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [mockRollbackRow],
      });

      const result = await getPendingRollbacks('t1');
      expect(result).toHaveLength(1);
      expect(result[0].rollback_status).toBe('pending');
    });

    it('should respect limit parameter', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await getPendingRollbacks('t1', 10);
      expect(safeQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10],
      );
    });
  });
});
