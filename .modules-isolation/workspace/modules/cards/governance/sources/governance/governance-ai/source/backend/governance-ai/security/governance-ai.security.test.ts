/**
 * Governance AI Security — Validation Tests
 *
 * MP-26 §12: unit tests for security registration compliance.
 * Verifies permissions, roles, actions, and approval matrix.
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { GOVERNANCE_AI_PERMISSIONS, GOVERNANCE_AI_ROLES, GOVERNANCE_AI_ACTIONS } from './governance-ai.security';
import { GOVERNANCE_AI_APPROVAL_MATRIX } from './governance-ai.approval-matrix';

describe('Governance AI Permissions', () => {
  it('defines all required permission codes', () => {
    const codes = GOVERNANCE_AI_PERMISSIONS.map(p => p.permissionCode);
    expect(codes).toContain('governance_ai.record.read');
    expect(codes).toContain('governance_ai.record.write');
    expect(codes).toContain('governance_ai.record.delete');
    expect(codes).toContain('governance_ai.record.approve');
    expect(codes).toContain('governance_ai.manage');
    expect(codes).toContain('governance_ai.pipeline.execute');
    expect(codes).toContain('governance_ai.pipeline.read');
    expect(codes).toContain('governance_ai.signal.read');
    expect(codes).toContain('governance_ai.signal.execute');
    expect(codes).toContain('governance_ai.signal.interpret');
    expect(codes).toContain('governance_ai.compliance_score.read');
    expect(codes).toContain('governance_ai.compliance_score.execute');
    expect(codes).toContain('governance_ai.health.read');
    expect(codes).toContain('governance_ai.health.execute');
    expect(codes).toContain('governance_ai.escalation.read');
    expect(codes).toContain('governance_ai.escalation.execute');
    expect(codes).toContain('governance_ai.recommendation.read');
    expect(codes).toContain('governance_ai.recommendation.execute');
    expect(codes).toContain('governance_ai.recommendation.approve');
  });

  it('follows module.resource.action naming convention', () => {
    for (const p of GOVERNANCE_AI_PERMISSIONS) {
      const parts = p.permissionCode.split('.');
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[0]).toBe('governance_ai');
    }
  });

  it('marks sensitive permissions correctly', () => {
    const sensitive = GOVERNANCE_AI_PERMISSIONS.filter(p => p.sensitive);
    const sensitiveCodes = sensitive.map(p => p.permissionCode);
    expect(sensitiveCodes).toContain('governance_ai.record.delete');
    expect(sensitiveCodes).toContain('governance_ai.record.approve');
    expect(sensitiveCodes).toContain('governance_ai.pipeline.execute');
    expect(sensitiveCodes).toContain('governance_ai.signal.execute');
    expect(sensitiveCodes).toContain('governance_ai.escalation.execute');
  });

  it('has bilingual descriptions for all permissions', () => {
    for (const p of GOVERNANCE_AI_PERMISSIONS) {
      expect(p.descriptionEn).toBeTruthy();
      expect(p.descriptionAr).toBeTruthy();
    }
  });
});

describe('Governance AI Roles', () => {
  it('defines all 8 required archetypes', () => {
    const archetypes = GOVERNANCE_AI_ROLES.map(r => r.archetype);
    expect(archetypes).toContain('executive_owner');
    expect(archetypes).toContain('module_lead');
    expect(archetypes).toContain('approver');
    expect(archetypes).toContain('operator');
    expect(archetypes).toContain('contributor');
    expect(archetypes).toContain('reviewer');
    expect(archetypes).toContain('auditor');
    expect(archetypes).toContain('viewer');
  });

  it('has exactly one default role', () => {
    const defaults = GOVERNANCE_AI_ROLES.filter(r => r.isDefault);
    expect(defaults.length).toBe(1);
    expect(defaults[0].archetype).toBe('viewer');
  });

  it('has permissions wired to all roles (not empty arrays)', () => {
    for (const role of GOVERNANCE_AI_ROLES) {
      expect(role.permissions.length).toBeGreaterThan(0);
    }
  });

  it('executive_owner has all permissions', () => {
    const eo = GOVERNANCE_AI_ROLES.find(r => r.archetype === 'executive_owner')!;
    const allPermCodes = GOVERNANCE_AI_PERMISSIONS.map(p => p.permissionCode);
    for (const code of allPermCodes) {
      expect(eo.permissions).toContain(code);
    }
  });

  it('viewer has only read permissions', () => {
    const viewer = GOVERNANCE_AI_ROLES.find(r => r.archetype === 'viewer')!;
    for (const perm of viewer.permissions) {
      expect(perm).toMatch(/\.(read|export)$/);
    }
  });

  it('operator cannot approve or delete', () => {
    const operator = GOVERNANCE_AI_ROLES.find(r => r.archetype === 'operator')!;
    expect(operator.permissions).not.toContain('governance_ai.record.approve');
    expect(operator.permissions).not.toContain('governance_ai.record.delete');
    expect(operator.permissions).not.toContain('governance_ai.recommendation.approve');
  });

  it('has bilingual names and descriptions', () => {
    for (const role of GOVERNANCE_AI_ROLES) {
      expect(role.nameEn).toBeTruthy();
      expect(role.nameAr).toBeTruthy();
      expect(role.descriptionEn).toBeTruthy();
      expect(role.descriptionAr).toBeTruthy();
    }
  });
});

describe('Governance AI Actions', () => {
  it('defines at least 10 actions', () => {
    expect(GOVERNANCE_AI_ACTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('blocks AI from approving narratives and deploying models', () => {
    const approveNarr = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.narrative.approve');
    const deployModel = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.model.deploy');
    expect(approveNarr?.aiAllowed).toBe(false);
    expect(deployModel?.aiAllowed).toBe(false);
  });

  it('allows AI to detect and interpret signals', () => {
    const detect = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.signal.detect');
    const interpret = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.signal.interpret');
    expect(detect?.aiAllowed).toBe(true);
    expect(interpret?.aiAllowed).toBe(true);
  });

  it('requires approval for escalation and critical dismissal', () => {
    const escalate = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.signal.escalate');
    const dismiss = GOVERNANCE_AI_ACTIONS.find(a => a.actionCode === 'governance_ai.signal.dismiss_critical');
    expect(escalate?.requiresApproval).toBe(true);
    expect(dismiss?.requiresApproval).toBe(true);
  });

  it('has bilingual descriptions', () => {
    for (const action of GOVERNANCE_AI_ACTIONS) {
      expect(action.descriptionEn).toBeTruthy();
      expect(action.descriptionAr).toBeTruthy();
    }
  });
});

describe('Governance AI Approval Matrix', () => {
  it('covers standard lifecycle transitions', () => {
    const transitions = GOVERNANCE_AI_APPROVAL_MATRIX.map(r => `${r.fromStatus}->${r.toStatus}`);
    expect(transitions).toContain('draft->in_review');
    expect(transitions).toContain('in_review->approved');
    expect(transitions).toContain('approved->published');
    expect(transitions).toContain('published->archived');
    expect(transitions).toContain('any->suspended');
  });

  it('requires approvers for review->approved transition', () => {
    const rule = GOVERNANCE_AI_APPROVAL_MATRIX.find(r => r.fromStatus === 'in_review' && r.toStatus === 'approved');
    expect(rule).toBeDefined();
    expect(rule!.minApprovers).toBeGreaterThanOrEqual(1);
    expect(rule!.autoApproveAllowed).toBe(false);
    expect(rule!.evidenceRequired).toBe(true);
  });

  it('requires executive_owner override for suspension', () => {
    const rule = GOVERNANCE_AI_APPROVAL_MATRIX.find(r => r.toStatus === 'suspended');
    expect(rule).toBeDefined();
    expect(rule!.requiredRole).toBe('governance_ai.executive_owner');
    expect(rule!.autoApproveAllowed).toBe(false);
  });

  it('all rules have escalation paths', () => {
    for (const rule of GOVERNANCE_AI_APPROVAL_MATRIX) {
      expect(rule.escalationPath.length).toBeGreaterThan(0);
    }
  });
});
