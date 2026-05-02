import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * DAuth Integration Tests for Workflow Module
 *
 * Validates that the workflow module correctly delegates to DAuth for:
 * - Permission checks before approval
 * - SoD violation blocking
 * - Self-approval prevention
 * - Delegated authority resolution
 *
 * These tests mock DAuth functions and verify correct call patterns
 * and deny-by-default behavior (Law 11).
 */

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
  resolveWorkflowActingContext,
  canPerformWorkflowAction,
} from '../integration/lifecycle-bridge.service';
import {
  evaluateLifecycleTransition,
  evaluateSod,
  checkSelfApproval,
  validateDelegation,
  evaluateDelegatedAccess,
  canPerform,
} from '../../ports/auth.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

describe('Workflow DAuth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission check before approval transition', () => {
    it('should call DAuth evaluateLifecycleTransition with correct parameters', async () => {
      (evaluateLifecycleTransition as any).mockResolvedValueOnce({
        allowed: true, reason: 'ok',
        checks: {
          permissionValid: true, transitionValid: true, authorityValid: true,
          ownershipValid: true, sodValid: true, approvalRequired: false, approvalSatisfied: true,
        },
      });

      await authorizeWorkflowTransition({
        tenantId: 't1', userId: 'approver-1', instanceId: 'inst-1',
        moduleCode: 'risk', entityType: 'risk_record', entityId: 'ent-1',
        fromState: 'pending_approval', toState: 'approved',
        permissionCode: 'risk.record.approve', userRoles: ['risk_approver'],
      });

      expect(evaluateLifecycleTransition).toHaveBeenCalledWith(
        't1', 'approver-1',
        expect.objectContaining({
          moduleCode: 'risk',
          fromState: 'pending_approval',
          toState: 'approved',
          permissionCode: 'risk.record.approve',
        }),
      );
    });

    it('should record audit when DAuth denies the transition', async () => {
      (evaluateLifecycleTransition as any).mockResolvedValueOnce({
        allowed: false, reason: 'insufficient_authority',
        checks: {
          permissionValid: true, transitionValid: true, authorityValid: false,
          ownershipValid: true, sodValid: true, approvalRequired: false, approvalSatisfied: false,
        },
      });

      const result = await authorizeWorkflowTransition({
        tenantId: 't1', userId: 'u1', instanceId: 'inst-1',
        moduleCode: 'risk', entityType: 'risk_record', entityId: 'ent-1',
        fromState: 'draft', toState: 'approved',
        permissionCode: 'risk.record.approve', userRoles: ['viewer'],
      });

      expect(result.allowed).toBe(false);
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'lifecycle_auth_denied',
          entityType: 'risk_record',
        }),
      );
    });
  });

  describe('SoD violation blocks approval', () => {
    it('should detect SoD violation when user has conflicting roles', async () => {
      (evaluateSod as any).mockResolvedValueOnce({
        outcome: 'block',
        violations: [
          { roleA: 'risk_creator', roleB: 'risk_approver', description: 'Creator cannot approve' },
        ],
      });

      const result = await checkWorkflowSod({
        tenantId: 't1',
        userRoles: ['risk_creator', 'risk_approver'],
        moduleCode: 'risk',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('Creator cannot approve');
    });

    it('should pass SoD check for non-conflicting roles', async () => {
      (evaluateSod as any).mockResolvedValueOnce({
        outcome: 'allow',
        violations: [],
      });

      const result = await checkWorkflowSod({
        tenantId: 't1',
        userRoles: ['risk_viewer'],
        moduleCode: 'risk',
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('Self-approval prevention', () => {
    it('should block when user attempts to approve their own submission', async () => {
      (checkSelfApproval as any).mockResolvedValueOnce({ allowed: false });

      const result = await preventSelfApprovalForWorkflow({
        tenantId: 't1', userId: 'creator-1',
        entityType: 'risk_record', entityId: 'ent-1',
        action: 'approve',
      });

      expect(result.blocked).toBe(true);
      expect(checkSelfApproval).toHaveBeenCalledWith(
        't1', 'creator-1', 'risk_record', 'ent-1', 'approve',
      );
    });

    it('should allow when a different user approves', async () => {
      (checkSelfApproval as any).mockResolvedValueOnce({ allowed: true });

      const result = await preventSelfApprovalForWorkflow({
        tenantId: 't1', userId: 'different-user',
        entityType: 'risk_record', entityId: 'ent-1',
        action: 'approve',
      });

      expect(result.blocked).toBe(false);
    });
  });

  describe('Delegated authority applied correctly', () => {
    it('should validate delegation scope for agent actions', async () => {
      (validateDelegation as any).mockResolvedValueOnce({ grantId: 'grant-1' } as any);

      const result = await validateWorkflowDelegation({
        tenantId: 't1', agentId: 'A01',
        requiredScope: { moduleCode: 'risk', actions: ['assess', 'score'] } as any,
      });

      expect(result.valid).toBe(true);
      expect(validateDelegation).toHaveBeenCalledWith(
        't1', 'A01',
        expect.objectContaining({ moduleCode: 'risk' }),
      );
    });

    it('should reject when delegation scope is insufficient', async () => {
      (validateDelegation as any).mockResolvedValueOnce(null);

      const result = await validateWorkflowDelegation({
        tenantId: 't1', agentId: 'A01',
        requiredScope: { moduleCode: 'risk', actions: ['approve'] } as any,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('no_active_delegation_grant');
    });

    it('should resolve acting-on-behalf-of context', async () => {
      (evaluateDelegatedAccess as any).mockResolvedValueOnce({
        allowed: true,
        reason: 'delegation_active',
      });

      const result = await resolveWorkflowActingContext(
        { delegateId: 'A01', principalId: 'u1', tenantId: 't1' } as any,
        'risk.record.assess',
        'risk',
      );

      expect(result.allowed).toBe(true);
      expect(evaluateDelegatedAccess).toHaveBeenCalledWith(
        expect.objectContaining({ delegateId: 'A01' }),
        'risk.record.assess',
        'risk',
      );
    });

    it('should deny acting-on-behalf-of when DAuth fails (Law 11)', async () => {
      (evaluateDelegatedAccess as any).mockRejectedValueOnce(new Error('service down'));

      const result = await resolveWorkflowActingContext(
        { delegateId: 'A01', principalId: 'u1', tenantId: 't1' } as any,
        'risk.record.assess',
        'risk',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('deny by default');
    });
  });

  describe('canPerformWorkflowAction', () => {
    it('should check permission through DAuth canPerform', async () => {
      (canPerform as any).mockResolvedValueOnce(true);

      const result = await canPerformWorkflowAction('t1', 'u1', 'workflow.instance.start');
      expect(result).toBe(true);
      expect(canPerform).toHaveBeenCalledWith('t1', 'u1', 'workflow.instance.start');
    });
  });
});
