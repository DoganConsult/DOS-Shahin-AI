import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

vi.mock('./notification-event.service', () => ({
  emitNotificationEvent: vi.fn(),
}));

import {
  ALLOWED_TRANSITIONS,
  validateTransition,
  getAvailableTransitions,
  executeTransition,
  getEntityLifecycleTimeline,
  handleApprovalOutcome,
  onWorkflowTriggered,
  onTaskCreated,
  onApprovalRequired,
  onEscalation,
  onClosure,
  onFailure,
} from './notification-workflow.service';
import { safeQuery } from '../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('ALLOWED_TRANSITIONS', () => {
    it('defines pending as initial with sent target', () => {
      expect(ALLOWED_TRANSITIONS.pending).toContain('sent');
    });

    it('archived is terminal', () => {
      expect(ALLOWED_TRANSITIONS.archived).toEqual([]);
    });

    it('failed can retry to pending or archive', () => {
      expect(ALLOWED_TRANSITIONS.failed).toContain('pending');
      expect(ALLOWED_TRANSITIONS.failed).toContain('archived');
    });
  });

  describe('validateTransition()', () => {
    it('returns true for valid pending -> sent', () => {
      expect(validateTransition('pending', 'sent')).toBe(true);
    });

    it('returns false for invalid pending -> archived', () => {
      expect(validateTransition('pending', 'archived')).toBe(false);
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns targets for sent', () => {
      expect(getAvailableTransitions('sent')).toContain('delivered');
      expect(getAvailableTransitions('sent')).toContain('failed');
    });

    it('returns empty for unknown state', () => {
      expect(getAvailableTransitions('unknown')).toEqual([]);
    });
  });

  describe('executeTransition()', () => {
    it('rejects invalid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'pending', 'archived', USER);
      expect(result.success).toBe(false);
    });

    it('executes valid transition and emits event', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'pending', 'sent', USER);
      expect(result.success).toBe(true);
      expect(safeQuery).toHaveBeenCalled();
      expect(emitNotificationEvent).toHaveBeenCalled();
    });
  });

  describe('getEntityLifecycleTimeline()', () => {
    it('returns rows from audit trail', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ action: 'transition' }] });
      const result = await getEntityLifecycleTimeline(TENANT, ENTITY);
      expect(result).toHaveLength(1);
    });
  });

  describe('handleApprovalOutcome()', () => {
    it('returns error for non-existent entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await handleApprovalOutcome(TENANT, ENTITY, 'approved', USER);
      expect(result.success).toBe(false);
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: TENANT, entityId: ENTITY, entityType: 'notification', triggeredBy: USER, correlationId: 'cor-1' };

    it('onWorkflowTriggered emits event', async () => {
      await onWorkflowTriggered(ctx);
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { trigger: 'workflow_start' } }));
    });

    it('onTaskCreated emits with taskId', async () => {
      await onTaskCreated(ctx, 'task-1');
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ taskId: 'task-1' }) }));
    });

    it('onApprovalRequired emits with approverRole', async () => {
      await onApprovalRequired(ctx, 'notification.module_lead');
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ approverRole: 'notification.module_lead' }) }));
    });

    it('onEscalation emits with reason', async () => {
      await onEscalation(ctx, 'overdue', 'admin');
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: 'overdue' }) }));
    });

    it('onClosure emits with closure reason', async () => {
      await onClosure(ctx, 'done');
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ closureReason: 'done' }) }));
    });

    it('onFailure emits with error', async () => {
      await onFailure(ctx, 'fail');
      expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ error: 'fail' }) }));
    });
  });
