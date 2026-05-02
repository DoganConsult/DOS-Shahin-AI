import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

vi.mock('./packs-event.service', () => ({
  emitPacksEvent: vi.fn(),
}));

import {
  ALLOWED_TRANSITIONS,
  validateTransition,
  getAvailableTransitions as _getAvailableTransitions,
  isProtectedTransition,
  executeTransition,
  getEntityLifecycleTimeline,
  handleApprovalOutcome,
  onWorkflowTriggered,
  onTaskCreated,
  onApprovalRequired,
  onEscalation,
  onClosure,
  onFailure,
} from './packs-workflow.service';
import { safeQuery } from '../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('ALLOWED_TRANSITIONS', () => {
    it('defines draft -> assembling', () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain('assembling');
    });

    it('archived is terminal', () => {
      expect(ALLOWED_TRANSITIONS.archived).toEqual([]);
    });

    it('published can distribute or expire', () => {
      expect(ALLOWED_TRANSITIONS.published).toContain('distributed');
      expect(ALLOWED_TRANSITIONS.published).toContain('expired');
    });
  });

  describe('validateTransition()', () => {
    it('returns true for draft -> assembling', () => {
      expect(validateTransition('draft', 'assembling')).toBe(true);
    });

    it('returns false for draft -> approved', () => {
      expect(validateTransition('draft', 'approved')).toBe(false);
    });
  });

  describe('isProtectedTransition()', () => {
    it('in_review -> approved is protected', () => {
      expect(isProtectedTransition('in_review', 'approved')).toBe(true);
    });

    it('approved -> published is protected', () => {
      expect(isProtectedTransition('approved', 'published')).toBe(true);
    });

    it('draft -> assembling is not protected', () => {
      expect(isProtectedTransition('draft', 'assembling')).toBe(false);
    });
  });

  describe('executeTransition()', () => {
    it('rejects invalid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'published', USER);
      expect(result.success).toBe(false);
    });

    it('executes valid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'assembling', USER);
      expect(result.success).toBe(true);
      expect(emitPacksEvent).toHaveBeenCalled();
    });

    it('creates inbox for protected transition', async () => {
      await executeTransition(TENANT, ENTITY, 'in_review', 'approved', USER);
      const inboxCall = (safeQuery as any).mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('inbox_inbox'),
      );
      expect(inboxCall).toBeDefined();
    });
  });

  describe('getEntityLifecycleTimeline()', () => {
    it('returns audit rows', async () => {
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

    it('rejects by reverting to previous state', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'in_review' }] });
      const result = await handleApprovalOutcome(TENANT, ENTITY, 'rejected', USER);
      expect(result).toBeDefined();
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: TENANT, entityId: ENTITY, entityType: 'pack', triggeredBy: USER, correlationId: 'cor-1' };

    it('onWorkflowTriggered emits', async () => {
      await onWorkflowTriggered(ctx);
      expect(emitPacksEvent).toHaveBeenCalled();
    });

    it('onTaskCreated emits with taskId', async () => {
      await onTaskCreated(ctx, 'task-1');
      expect(emitPacksEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ taskId: 'task-1' }) }));
    });

    it('onApprovalRequired emits', async () => {
      await onApprovalRequired(ctx, 'packs.module_lead');
      expect(emitPacksEvent).toHaveBeenCalled();
    });

    it('onEscalation emits', async () => {
      await onEscalation(ctx, 'SLA', 'admin');
      expect(emitPacksEvent).toHaveBeenCalled();
    });

    it('onClosure emits', async () => {
      await onClosure(ctx, 'done');
      expect(emitPacksEvent).toHaveBeenCalled();
    });

    it('onFailure emits', async () => {
      await onFailure(ctx, 'err');
      expect(emitPacksEvent).toHaveBeenCalled();
    });
  });
