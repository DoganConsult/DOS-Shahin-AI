import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../../../platform/dauth', () => ({
  evaluateLifecycleTransition: vi.fn(),
  evaluateSod: vi.fn(),
  checkSelfApproval: vi.fn(),
  validateDelegation: vi.fn(),
  evaluateDelegatedAccess: vi.fn(),
  canPerform: vi.fn(),
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

import {
  authorizeWorkflowTransition,
  checkWorkflowSod,
  preventSelfApprovalForWorkflow,
  validateWorkflowDelegation,
  resolveWorkflowActingContext as _resolveWorkflowActingContext,
  canPerformWorkflowAction,
} from './lifecycle-bridge.service';
import {
  evaluateLifecycleTransition,
  evaluateSod,
  checkSelfApproval,
  validateDelegation,
  evaluateDelegatedAccess as _evaluateDelegatedAccess,
  canPerform,
} from '../../ports/auth.port';

describe('Lifecycle Bridge Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorizeWorkflowTransition', () => {
    const baseInput = {
      tenantId: 't1', userId: 'u1', instanceId: 'inst-1',
      moduleCode: 'risk', entityType: 'risk_record', entityId: 'ent-1',
      fromState: 'draft', toState: 'review',
      permissionCode: 'risk.transition', userRoles: ['analyst'],
    };

    it('should allow transition when DAuth permits', async () => {
      (evaluateLifecycleTransition as any).mockResolvedValueOnce({
        allowed: true, reason: 'ok',
        checks: {
          permissionValid: true, transitionValid: true, authorityValid: true,
          ownershipValid: true, sodValid: true, approvalRequired: false, approvalSatisfied: true,
        },
      });

      const result = await authorizeWorkflowTransition(baseInput);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('should deny transition when DAuth denies', async () => {
      (evaluateLifecycleTransition as any).mockResolvedValueOnce({
        allowed: false, reason: 'permission_denied',
        checks: {
          permissionValid: false, transitionValid: true, authorityValid: true,
          ownershipValid: true, sodValid: true, approvalRequired: false, approvalSatisfied: false,
        },
      });

      const result = await authorizeWorkflowTransition(baseInput);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('permission_denied');
    });

    it('should deny by default when DAuth is unavailable (Law 11)', async () => {
      (evaluateLifecycleTransition as any).mockRejectedValueOnce(new Error('DAuth service down'));

      const result = await authorizeWorkflowTransition(baseInput);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('deny by default');
    });
  });

  describe('checkWorkflowSod', () => {
    it('should pass when no SoD violations', async () => {
      (evaluateSod as any).mockResolvedValueOnce({
        outcome: 'allow',
        violations: [],
      });

      const result = await checkWorkflowSod({
        tenantId: 't1', userRoles: ['analyst'], moduleCode: 'risk',
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when SoD violations detected', async () => {
      (evaluateSod as any).mockResolvedValueOnce({
        outcome: 'block',
        violations: [{ roleA: 'creator', roleB: 'approver', description: 'Cannot create and approve same entity' }],
      });

      const result = await checkWorkflowSod({
        tenantId: 't1', userRoles: ['creator', 'approver'], moduleCode: 'risk',
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should deny by default when SoD engine unavailable', async () => {
      (evaluateSod as any).mockRejectedValueOnce(new Error('unavailable'));
      const result = await checkWorkflowSod({
        tenantId: 't1', userRoles: ['analyst'], moduleCode: 'risk',
      });
      expect(result.passed).toBe(false);
      expect(result.outcome).toBe('block');
    });
  });

  describe('preventSelfApprovalForWorkflow', () => {
    it('should not block when different user approves', async () => {
      (checkSelfApproval as any).mockResolvedValueOnce({ allowed: true });

      const result = await preventSelfApprovalForWorkflow({
        tenantId: 't1', userId: 'u2', entityType: 'risk_record',
        entityId: 'ent-1', action: 'approve',
      });
      expect(result.blocked).toBe(false);
    });

    it('should block self-approval', async () => {
      (checkSelfApproval as any).mockResolvedValueOnce({ allowed: false });

      const result = await preventSelfApprovalForWorkflow({
        tenantId: 't1', userId: 'u1', entityType: 'risk_record',
        entityId: 'ent-1', action: 'approve',
      });
      expect(result.blocked).toBe(true);
    });

    it('should block by default when DAuth unavailable', async () => {
      (checkSelfApproval as any).mockRejectedValueOnce(new Error('unavailable'));

      const result = await preventSelfApprovalForWorkflow({
        tenantId: 't1', userId: 'u1', entityType: 'risk_record',
        entityId: 'ent-1', action: 'approve',
      });
      expect(result.blocked).toBe(true);
    });
  });

  describe('validateWorkflowDelegation', () => {
    it('should return valid when delegation grant exists', async () => {
      (validateDelegation as any).mockResolvedValueOnce({ grantId: 'g-1' } as any);

      const result = await validateWorkflowDelegation({
        tenantId: 't1', agentId: 'agent-1',
        requiredScope: { moduleCode: 'risk', actions: ['read'] } as any,
      });
      expect(result.valid).toBe(true);
    });

    it('should return invalid when no grant', async () => {
      (validateDelegation as any).mockResolvedValueOnce(null);

      const result = await validateWorkflowDelegation({
        tenantId: 't1', agentId: 'agent-1',
        requiredScope: { moduleCode: 'risk', actions: ['approve'] } as any,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('canPerformWorkflowAction', () => {
    it('should return true when user has permission', async () => {
      (canPerform as any).mockResolvedValueOnce(true);
      const result = await canPerformWorkflowAction('t1', 'u1', 'workflow.execute');
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      (canPerform as any).mockResolvedValueOnce(false);
      const result = await canPerformWorkflowAction('t1', 'u1', 'workflow.admin');
      expect(result).toBe(false);
    });

    it('should deny by default on error (Law 11)', async () => {
      (canPerform as any).mockRejectedValueOnce(new Error('unavailable'));
      const result = await canPerformWorkflowAction('t1', 'u1', 'workflow.execute');
      expect(result).toBe(false);
    });
  });
});
