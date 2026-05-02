import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((t: string) => `tenant_${t}`),
}));

vi.mock('./analytics-event.service', () => ({
  emitAnalyticsEvent: vi.fn(),
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
} from './analytics-workflow.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { emitAnalyticsEvent } from './analytics-event.service';

const TENANT = 'test-tenant';
const ENTITY = 'entity-001';
const USER = 'user-001';

describe('AnalyticsWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ALLOWED_TRANSITIONS', () => {
    it('defines draft as initial state with scheduled target', () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain('scheduled');
    });

    it('archived is terminal with no outgoing transitions', () => {
      expect(ALLOWED_TRANSITIONS.archived).toEqual([]);
    });

    it('stale can regenerate or archive', () => {
      expect(ALLOWED_TRANSITIONS.stale).toContain('generating');
      expect(ALLOWED_TRANSITIONS.stale).toContain('archived');
    });
  });

  describe('validateTransition()', () => {
    it('returns true for valid transition draft -> scheduled', () => {
      expect(validateTransition('draft', 'scheduled')).toBe(true);
    });

    it('returns false for invalid transition draft -> published', () => {
      expect(validateTransition('draft', 'published')).toBe(false);
    });

    it('returns false for unknown source state', () => {
      expect(validateTransition('nonexistent', 'draft')).toBe(false);
    });
  });

  describe('getAvailableTransitions()', () => {
    it('returns correct targets for generating', () => {
      expect(getAvailableTransitions('generating')).toEqual(['published', 'draft']);
    });

    it('returns empty array for terminal state', () => {
      expect(getAvailableTransitions('archived')).toEqual([]);
    });

    it('returns empty array for unknown state', () => {
      expect(getAvailableTransitions('unknown')).toEqual([]);
    });
  });

  describe('executeTransition()', () => {
    it('rejects invalid transition', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'published', USER);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('executes valid transition and emits event', async () => {
      const result = await executeTransition(TENANT, ENTITY, 'draft', 'scheduled', USER);
      expect(result.success).toBe(true);
      expect(safeQuery).toHaveBeenCalled();
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          entityId: ENTITY,
          action: 'status_changed',
          triggeredBy: USER,
        }),
      );
    });

    it('creates inbox notification for protected transition generating->published', async () => {
      await executeTransition(TENANT, ENTITY, 'generating', 'published', USER);
      const inboxCall = (safeQuery as any).mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('inbox_inbox'),
      );
      expect(inboxCall).toBeDefined();
    });
  });

  describe('getEntityLifecycleTimeline()', () => {
    it('queries audit trail for entity', async () => {
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

    it('advances on approval', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ status: 'generating' }] });
      const result = await handleApprovalOutcome(TENANT, ENTITY, 'approved', USER);
      expect(result).toBeDefined();
    });
  });

  describe('workflow hooks', () => {
    const ctx = { tenantId: TENANT, entityId: ENTITY, entityType: 'analytics', triggeredBy: USER, correlationId: 'cor-1' };

    it('onWorkflowTriggered emits event', async () => {
      await onWorkflowTriggered(ctx);
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { trigger: 'workflow_start' } }));
    });

    it('onTaskCreated emits event with taskId', async () => {
      await onTaskCreated(ctx, 'task-1');
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { taskId: 'task-1', trigger: 'task_creation' } }));
    });

    it('onApprovalRequired emits event with approverRole', async () => {
      await onApprovalRequired(ctx, 'analytics.module_lead');
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { approverRole: 'analytics.module_lead', trigger: 'approval_hook' } }));
    });

    it('onEscalation emits event with reason and target', async () => {
      await onEscalation(ctx, 'SLA breach', 'admin');
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { reason: 'SLA breach', escalateTo: 'admin', trigger: 'escalation_hook' } }));
    });

    it('onClosure emits event with closure reason', async () => {
      await onClosure(ctx, 'Completed');
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { closureReason: 'Completed', trigger: 'closure_hook' } }));
    });

    it('onFailure emits event with error', async () => {
      await onFailure(ctx, 'timeout');
      expect(emitAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ data: { error: 'timeout', trigger: 'failure_compensation' } }));
    });
  });
});
