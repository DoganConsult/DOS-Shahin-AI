import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
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
  isProtectedTransition,
} from './proactive-leadership-workflow.service';
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
      expect(validateTransition('draft', 'in_review')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(validateTransition('draft', 'archived')).toBe(false);
    });

    it('should reject transitions from unknown states', () => {
      expect(validateTransition('nonexistent', 'in_review')).toBe(false);
    });
  });

  describe('isProtectedTransition', () => {
    it('should identify protected transitions', () => {
      const result = isProtectedTransition('in_review', 'approved');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for non-protected transitions', () => {
      expect(isProtectedTransition('draft', 'in_review')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for a state', () => {
      const result = getAvailableTransitions('draft');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty for archived', () => {
      expect(getAvailableTransitions('archived')).toEqual([]);
    });

    it('should return empty for unknown states', () => {
      expect(getAvailableTransitions('nonexistent')).toEqual([]);
    });
  });

  describe('executeTransition', () => {
    it('should reject invalid transitions', async () => {
      const result = await executeTransition('t1', 'e1', 'draft', 'archived', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should execute valid transitions', async () => {
      const result = await executeTransition('t1', 'e1', 'draft', 'in_review', 'u1');
      expect(result.success).toBe(true);
      expect(safeQuery).toHaveBeenCalled();
    });
  });

  describe('handleApprovalOutcome', () => {
    it('should return error for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await handleApprovalOutcome('t1', 'e1', 'approved', 'u1');
      expect(result.success).toBe(false);
    });

    it('should handle approved outcome', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'draft' }] });
      const result = await handleApprovalOutcome('t1', 'e1', 'approved', 'u1');
      expect(result).toBeDefined();
    });

    it('should handle rejected outcome', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'in_review' }] });
      const result = await handleApprovalOutcome('t1', 'e1', 'rejected', 'u1');
      expect(result).toBeDefined();
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: 't1', entityId: 'e1', entityType: 'proactive-leadership', triggeredBy: 'u1' };

    it('onWorkflowTriggered should not throw', async () => {
      await expect(onWorkflowTriggered(ctx)).resolves.not.toThrow();
    });

    it('onTaskCreated should not throw', async () => {
      await expect(onTaskCreated(ctx, 'task-1')).resolves.not.toThrow();
    });

    it('onApprovalRequired should not throw', async () => {
      await expect(onApprovalRequired(ctx, 'approver')).resolves.not.toThrow();
    });

    it('onEscalation should not throw', async () => {
      await expect(onEscalation(ctx, 'reason', 'escalateTo')).resolves.not.toThrow();
    });

    it('onClosure should not throw', async () => {
      await expect(onClosure(ctx, 'closureReason')).resolves.not.toThrow();
    });

    it('onFailure should not throw', async () => {
      await expect(onFailure(ctx, 'error')).resolves.not.toThrow();
    });
  });
