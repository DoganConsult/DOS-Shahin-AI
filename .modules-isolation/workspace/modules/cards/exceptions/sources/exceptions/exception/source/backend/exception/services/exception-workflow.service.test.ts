import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('./exception-event.service', () => ({
  emitExceptionEvent: vi.fn(),
}));

vi.mock('../workflows/exception-lifecycle', () => ({
  EXCEPTION_TRANSITIONS: {
    draft: ['submitted', 'archived'],
    submitted: ['under_review', 'draft', 'archived'],
    under_review: ['approved', 'rejected', 'submitted', 'archived'],
    approved: ['active', 'revoked'],
    rejected: ['archived'],
    active: ['expiring', 'revoked', 'closed'],
    expiring: ['active', 'expired', 'closed'],
    expired: ['closed', 'archived'],
    revoked: ['archived'],
    closed: ['archived'],
    archived: [],
  },
}));

import {
  validateTransition,
  getAvailableTransitions,
  executeTransition,
  handleApprovalOutcome,
  onWorkflowTriggered,
  onTaskCreated,
  onApprovalRequired,
  onEscalation,
  onClosure,
  onFailure,
} from './exception-workflow.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('validateTransition', () => {
    it('should accept valid transitions', () => {
      expect(validateTransition('draft', 'submitted')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(validateTransition('draft', 'approved')).toBe(false);
    });

    it('should reject transitions from unknown states', () => {
      expect(validateTransition('nonexistent', 'submitted')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for a state', () => {
      const result = getAvailableTransitions('draft');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('submitted');
    });

    it('should return empty for archived', () => {
      expect(getAvailableTransitions('archived')).toEqual([]);
    });

    it('should return empty for unknown states', () => {
      expect(getAvailableTransitions('nonexistent')).toEqual([]);
    });
  });

  describe('executeTransition', () => {
    it('should execute valid transitions', async () => {
      const result = await executeTransition('t1', 'e1', 'draft', 'submitted', 'u1');
      expect(result.success).toBe(true);
      expect(safeQuery).toHaveBeenCalled();
    });

    it('should reject invalid transitions', async () => {
      const result = await executeTransition('t1', 'e1', 'draft', 'approved', 'u1');
      expect(result.success).toBe(false);
    });
  });

  describe('handleApprovalOutcome', () => {
    it('should handle approved outcome', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'under_review' }] });
      const result = await handleApprovalOutcome('t1', 'e1', 'approved', 'u1');
      expect(result).toBeDefined();
    });

    it('should return error for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await handleApprovalOutcome('t1', 'missing', 'approved', 'u1');
      expect(result.success).toBe(false);
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: 't1', entityId: 'e1', entityType: 'exception', triggeredBy: 'u1' };

    it('onWorkflowTriggered should resolve', async () => {
      await expect(onWorkflowTriggered(ctx)).resolves.not.toThrow();
    });

    it('onTaskCreated should resolve', async () => {
      await expect(onTaskCreated(ctx, 'task-1')).resolves.not.toThrow();
    });

    it('onApprovalRequired should resolve', async () => {
      await expect(onApprovalRequired(ctx, 'admin')).resolves.not.toThrow();
    });

    it('onEscalation should resolve', async () => {
      await expect(onEscalation(ctx, 'overdue', 'manager')).resolves.not.toThrow();
    });

    it('onClosure should resolve', async () => {
      await expect(onClosure(ctx, 'completed')).resolves.not.toThrow();
    });

    it('onFailure should resolve', async () => {
      await expect(onFailure(ctx, 'error')).resolves.not.toThrow();
    });
  });
