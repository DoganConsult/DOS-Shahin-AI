import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('./inbox-event.service', () => ({
  emitInboxEvent: vi.fn(),
}));

import {
  ALLOWED_TRANSITIONS as _ALLOWED_TRANSITIONS,
  validateTransition,
  getAvailableTransitions,
  executeTransition,
  getEntityLifecycleTimeline as _getEntityLifecycleTimeline,
  handleApprovalOutcome,
  onWorkflowTriggered,
  onTaskCreated,
  onApprovalRequired,
  onEscalation,
  onClosure,
  onFailure,
} from './inbox-workflow.service';
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
      expect(validateTransition('unread', 'read')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(validateTransition('unread', 'archived')).toBe(false);
    });

    it('should reject from unknown states', () => {
      expect(validateTransition('nonexistent', 'read')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return transitions for a state', () => {
      const r = getAvailableTransitions('unread');
      expect(Array.isArray(r)).toBe(true);
      expect(r).toContain('read');
    });

    it('should return empty for archived', () => {
      expect(getAvailableTransitions('archived')).toEqual([]);
    });
  });

  describe('executeTransition', () => {
    it('should execute valid transitions', async () => {
      const r = await executeTransition('t1', 'e1', 'unread', 'read', 'u1');
      expect(r.success).toBe(true);
    });

    it('should reject invalid transitions', async () => {
      const r = await executeTransition('t1', 'e1', 'unread', 'archived', 'u1');
      expect(r.success).toBe(false);
    });
  });

  describe('handleApprovalOutcome', () => {
    it('should handle approved outcome', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'unread' }] });
      const r = await handleApprovalOutcome('t1', 'e1', 'approved', 'u1');
      expect(r).toBeDefined();
    });

    it('should return error for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const r = await handleApprovalOutcome('t1', 'e1', 'approved', 'u1');
      expect(r.success).toBe(false);
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: 't1', entityId: 'e1', entityType: 'test', triggeredBy: 'u1' };

    it('onWorkflowTriggered', async () => { await expect(onWorkflowTriggered(ctx)).resolves.not.toThrow(); });
    it('onTaskCreated', async () => { await expect(onTaskCreated(ctx, 'task-1')).resolves.not.toThrow(); });
    it('onApprovalRequired', async () => { await expect(onApprovalRequired(ctx, 'admin')).resolves.not.toThrow(); });
    it('onEscalation', async () => { await expect(onEscalation(ctx, 'r', 'm')).resolves.not.toThrow(); });
    it('onClosure', async () => { await expect(onClosure(ctx, 'done')).resolves.not.toThrow(); });
    it('onFailure', async () => { await expect(onFailure(ctx, 'err')).resolves.not.toThrow(); });
  });

