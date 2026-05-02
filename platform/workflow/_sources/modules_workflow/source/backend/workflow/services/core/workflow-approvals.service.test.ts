import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../../utils/resilient-catch', () => ({
  catchHandler: vi.fn(() => () => {}),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));
vi.mock('../../../../errors/index', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(type: string, id: string) { super(`${type} ${id} not found`); }
  },
  ValidationError: class ValidationError extends Error {
    constructor(public errors: unknown[]) { super(errors[0]?.message ?? 'Validation error'); }
  },
  ConflictError: class ConflictError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

import {
  createApprovalStep,
  resolveApproval,
  escalateApproval,
  getApprovalQueue,
  getApprovalHistory,
  checkApprovalStatus,
  getOverdueApprovals as _getOverdueApprovals,
  checkPreconditions,
} from './workflow-approvals.service';
import { safeQuery } from '../../ports/database.port';

const mockApprovalRow = {
  approval_id: 'appr-1',
  execution_id: 'exec-1',
  step_id: 'step-1',
  approver_id: 'user-1',
  status: 'pending',
  sla_deadline: '2026-04-05T00:00:00Z',
  escalation_chain: '["user-2","user-3"]',
  decision_comment: null,
  decided_at: null,
  created_at: '2026-04-04T00:00:00Z',
};

describe('Workflow Approvals Service (Core)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApprovalStep', () => {
    it('should create an approval step and return record', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });

      const result = await createApprovalStep('t1', 'exec-1', 'user-1', 24, ['user-2']);
      expect(result.approval_id).toBe('appr-1');
      expect(result.status).toBe('pending');
      expect(result.approver_id).toBe('user-1');
    });

    it('should throw when insert returns no rows', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(createApprovalStep('t1', 'exec-1', 'user-1')).rejects.toThrow('Failed to create approval step');
    });
  });

  describe('resolveApproval', () => {
    it('should resolve a pending approval with approved decision', async () => {
      // Existing status check
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'pending', approver_id: 'user-1' }] });
      // Update
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ ...mockApprovalRow, status: 'approved', decided_at: '2026-04-04T12:00:00Z' }] });
      // Audit trail insert (non-fatal)
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await resolveApproval('t1', 'appr-1', 'approved', 'Looks good');
      expect(result.status).toBe('approved');
    });

    it('should throw ValidationError for invalid decision', async () => {
      await expect(resolveApproval('t1', 'appr-1', 'invalid' as any)).rejects.toThrow('Must be "approved" or "rejected"');
    });

    it('should throw NotFoundError when approval does not exist', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(resolveApproval('t1', 'appr-x', 'approved')).rejects.toThrow('not found');
    });

    it('should throw ConflictError when approval already resolved', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'approved' }] });
      await expect(resolveApproval('t1', 'appr-1', 'rejected')).rejects.toThrow('already approved');
    });
  });

  describe('escalateApproval', () => {
    it('should escalate to next person in chain', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockApprovalRow }],
      });
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockApprovalRow, status: 'escalated', approver_id: 'user-2' }],
      });
      // Audit trail
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await escalateApproval('t1', 'appr-1');
      expect(result.status).toBe('escalated');
      expect(result.approver_id).toBe('user-2');
    });

    it('should throw ConflictError when approval is not pending', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ ...mockApprovalRow, status: 'approved' }] });
      await expect(escalateApproval('t1', 'appr-1')).rejects.toThrow('Cannot escalate');
    });
  });

  describe('getApprovalQueue', () => {
    it('should return pending approvals for an approver', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [mockApprovalRow],
      });

      const result = await getApprovalQueue('t1', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].approval_id).toBe('appr-1');
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for an execution', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockApprovalRow, status: 'approved', decided_at: '2026-04-04T12:00:00Z' }],
      });

      const result = await getApprovalHistory('t1', 'exec-1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('approved');
    });
  });

  describe('checkApprovalStatus', () => {
    it('should return approval record when found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });
      const result = await checkApprovalStatus('t1', 'appr-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('pending');
    });

    it('should return null when not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await checkApprovalStatus('t1', 'appr-x');
      expect(result).toBeNull();
    });
  });

  describe('checkPreconditions', () => {
    it('should pass when all preconditions are met', () => {
      const result = checkPreconditions(
        [{ status: 'approved' }, { status: 'approved' }],
        true, 2, true,
      );
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail when not enough approvals', () => {
      const result = checkPreconditions(
        [{ status: 'approved' }, { status: 'pending' }],
        true, 2, true,
      );
      expect(result.valid).toBe(false);
      expect(result.missing[0]).toContain('Requires 2 approval(s)');
    });

    it('should fail when evidence is missing and required', () => {
      const result = checkPreconditions(
        [{ status: 'approved' }],
        false, 1, true,
      );
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('Required evidence not provided');
    });
  });
});
