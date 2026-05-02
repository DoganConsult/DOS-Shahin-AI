import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  query: vi.fn(),
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../notification/services/notification.service', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../admin/services/enterprise-authz.service', () => ({
  enterpriseAuthzService: {
    can: vi.fn().mockResolvedValue(true),
    logDecision: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../tasks/task-auto-resolution.service', () => ({
  tryAutoApprove: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));

import { initiateApproval, submitDecision, getPendingApprovals, getApprovalDetail, listApprovalRequests } from './approval-routing.service';

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
import { eventBus } from '../../ports/events.port';

const mockApprovalRow = {
  approval_id: 'appr-1',
  entity_type: 'risk',
  entity_id: 'risk-1',
  action: 'approve_risk',
  requested_by: 'user-1',
  route_id: 'default',
  approver_chain: JSON.stringify([{ userId: 'user-2', step: 0 }]),
  current_step: 0,
  status: 'pending',
  context: '{}',
  created_at: new Date('2026-04-04T00:00:00Z'),
  current_approver_id: 'user-2',
};

describe('Approval Routing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateApproval', () => {
    it('should create an approval request and notify approver', async () => {
      // tenant_config query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ config_value: { default: { steps: [{ userId: 'user-2' }] } } }],
      });
      // Insert approval_requests
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });

      const result = await initiateApproval('t1', {
        entityType: 'risk', entityId: 'risk-1', action: 'approve_risk',
        requestedBy: 'user-1', routeId: 'default',
      });

      expect(result.approvalId).toBe('appr-1');
      expect(result.status).toBe('pending');
    });
  });

  describe('submitDecision', () => {
    it('should reject when status is not pending', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ ...mockApprovalRow, status: 'approved' }] });
      await expect(
        submitDecision('t1', 'appr-1', { approverId: 'user-2', decision: 'approved' }),
      ).rejects.toThrow('already approved');
    });

    it('should block self-approval', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });
      await expect(
        submitDecision('t1', 'appr-1', { approverId: 'user-1', decision: 'approved' }),
      ).rejects.toThrow('Self-approval');
    });

    it('should handle rejection and publish event', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });
      // Record decision insert
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Update to rejected
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      await submitDecision('t1', 'appr-1', {
        approverId: 'user-2', decision: 'rejected', reason: 'Insufficient evidence',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'approval.rejected' }),
      );
    });

    it('should require delegateTo when delegating', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockApprovalRow] });
      // Decision insert
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      await expect(
        submitDecision('t1', 'appr-1', { approverId: 'user-2', decision: 'delegated' }),
      ).rejects.toThrow('delegateTo is required');
    });

    it('should approve last step and publish completed event', async () => {
      const singleStepRow = {
        ...mockApprovalRow,
        approver_chain: JSON.stringify([{ userId: 'user-2', step: 0 }]),
        current_step: 0,
      };
      (safeQuery as any).mockResolvedValueOnce({ rows: [singleStepRow] });
      // Decision insert
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Update to approved
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      await submitDecision('t1', 'appr-1', { approverId: 'user-2', decision: 'approved' });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'approval.completed' }),
      );
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for a user', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockApprovalRow, current_approver_id: 'user-2' }],
      });

      const result = await getPendingApprovals('t1', 'user-2');
      expect(result).toHaveLength(1);
      expect(result[0].approvalId).toBe('appr-1');
    });
  });

  describe('listApprovalRequests', () => {
    it('should return filtered list of approval requests', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [mockApprovalRow],
      });

      const result = await listApprovalRequests('t1', { status: 'pending', limit: 10 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getApprovalDetail', () => {
    it('should throw when approval not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(getApprovalDetail('t1', 'appr-x')).rejects.toThrow('not found');
    });
  });
});
