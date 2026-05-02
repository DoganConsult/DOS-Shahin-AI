import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

vi.mock('./widgets-event.service', () => ({
  emitWidgetsEvent: vi.fn(),
}));

import {
  ALLOWED_TRANSITIONS,
  WIDGET_TRANSITIONS,
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
} from './widgets-workflow.service';
import { safeQuery } from '../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('transition maps', () => {
    it('record: draft -> in_review', () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain('in_review');
    });

    it('record: archived is terminal', () => {
      expect(ALLOWED_TRANSITIONS.archived).toEqual([]);
    });

    it('widget: draft -> configured', () => {
      expect(WIDGET_TRANSITIONS.draft).toContain('configured');
    });

    it('widget: active -> disabled or archived', () => {
      expect(WIDGET_TRANSITIONS.active).toContain('disabled');
      expect(WIDGET_TRANSITIONS.active).toContain('archived');
    });
  });

  describe('validateTransition()', () => {
    it('validates record transition', () => {
      expect(validateTransition('draft', 'in_review')).toBe(true);
      expect(validateTransition('draft', 'active')).toBe(false);
    });

    it('validates widget transition', () => {
      expect(validateTransition('draft', 'configured', 'widget')).toBe(true);
      expect(validateTransition('draft', 'active', 'widget')).toBe(false);
    });
  });

  describe('isProtectedTransition()', () => {
    it('in_review -> approved is protected', () => {
      expect(isProtectedTransition('in_review', 'approved')).toBe(true);
    });

    it('configured -> active is protected', () => {
      expect(isProtectedTransition('configured', 'active')).toBe(true);
    });

    it('draft -> in_review is not protected', () => {
      expect(isProtectedTransition('draft', 'in_review')).toBe(false);
    });
  });

  describe('executeTransition()', () => {
    it('rejects invalid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'active', USER);
      expect(result.success).toBe(false);
    });

    it('executes valid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'in_review', USER);
      expect(result.success).toBe(true);
      expect(emitWidgetsEvent).toHaveBeenCalled();
    });

    it('writes audit trail', async () => {
      await executeTransition(TENANT, ENTITY, 'draft', 'in_review', USER);
      const auditCall = (safeQuery as any).mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('audit_trail'),
      );
      expect(auditCall).toBeDefined();
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
    it('returns rows', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ action: 'transition' }] });
      expect(await getEntityLifecycleTimeline(TENANT, ENTITY)).toHaveLength(1);
    });
  });

  describe('handleApprovalOutcome()', () => {
    it('returns error for missing entity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await handleApprovalOutcome(TENANT, ENTITY, 'approved', USER);
      expect(result.success).toBe(false);
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: TENANT, entityId: ENTITY, entityType: 'widget', triggeredBy: USER, correlationId: 'cor-1' };

    it('onWorkflowTriggered emits', async () => { await onWorkflowTriggered(ctx); expect(emitWidgetsEvent).toHaveBeenCalled(); });
    it('onTaskCreated emits', async () => { await onTaskCreated(ctx, 't-1'); expect(emitWidgetsEvent).toHaveBeenCalled(); });
    it('onApprovalRequired emits', async () => { await onApprovalRequired(ctx, 'lead'); expect(emitWidgetsEvent).toHaveBeenCalled(); });
    it('onEscalation emits', async () => { await onEscalation(ctx, 'SLA', 'admin'); expect(emitWidgetsEvent).toHaveBeenCalled(); });
    it('onClosure emits', async () => { await onClosure(ctx, 'done'); expect(emitWidgetsEvent).toHaveBeenCalled(); });
    it('onFailure emits', async () => { await onFailure(ctx, 'err'); expect(emitWidgetsEvent).toHaveBeenCalled(); });
  });
