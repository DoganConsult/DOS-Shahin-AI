import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock lifecycle port so registration is a no-op during import
const _registrations: unknown[] = [];
vi.mock('../ports/lifecycle.port', () => ({
  registerLifecycleDefinition: (...args: unknown[]) => { _registrations.push(args); },
  createProcessTask: vi.fn(),
}));

// Must import AFTER mocks are established
import {
  ACTION_ITEM_STATES,
  ACTION_ITEM_TRANSITIONS,
} from '../lifecycle-registration';
import {
  ACTION_PERMISSIONS,
  ACTION_ROLES,
  ACTION_ACTIONS,
} from '../security/action.security';
import { ACTION_SOD_RULES } from '../security/action.sod';
import { ACTION_APPROVAL_MATRIX } from '../security/action.approval-matrix';

// ── Lifecycle States ────────────────────────────────────────────

describe('Action Lifecycle States', () => {
  const states = [...ACTION_ITEM_STATES];

  beforeAll(() => {
    expect(states.length).toBeGreaterThan(0);
  });

  it('has exactly 8 states', () => {
    expect(states).toHaveLength(8);
  });

  it('includes all canonical states', () => {
    const expected = ['open', 'in_progress', 'completed', 'verified', 'closed', 'overdue', 'escalated', 'cancelled'];
    for (const s of expected) {
      expect(states).toContain(s);
    }
  });

  it('open is the initial state', () => {
    expect(states[0]).toBe('open');
  });
});

// ── Transitions ─────────────────────────────────────────────────

describe('Action Lifecycle Transitions', () => {
  it('open can transition to in_progress and cancelled', () => {
    expect(ACTION_ITEM_TRANSITIONS['open']).toEqual(expect.arrayContaining(['in_progress', 'cancelled']));
  });

  it('in_progress can transition to completed, overdue, and cancelled', () => {
    expect(ACTION_ITEM_TRANSITIONS['in_progress']).toEqual(
      expect.arrayContaining(['completed', 'overdue', 'cancelled']),
    );
  });

  it('completed can transition to verified and open', () => {
    expect(ACTION_ITEM_TRANSITIONS['completed']).toEqual(
      expect.arrayContaining(['verified', 'open']),
    );
  });

  it('verified can transition to closed only', () => {
    expect(ACTION_ITEM_TRANSITIONS['verified']).toEqual(['closed']);
  });

  it('closed is terminal with no outbound transitions', () => {
    expect(ACTION_ITEM_TRANSITIONS['closed']).toEqual([]);
  });

  it('verified path requires going through completed first', () => {
    // No direct transition from open/in_progress to verified
    expect(ACTION_ITEM_TRANSITIONS['open']).not.toContain('verified');
    expect(ACTION_ITEM_TRANSITIONS['in_progress']).not.toContain('verified');
  });

  it('overdue can transition to in_progress or escalated', () => {
    expect(ACTION_ITEM_TRANSITIONS['overdue']).toEqual(
      expect.arrayContaining(['in_progress', 'escalated']),
    );
  });

  it('escalated can transition back to in_progress', () => {
    expect(ACTION_ITEM_TRANSITIONS['escalated']).toContain('in_progress');
  });

  it('cancelled can reopen to open', () => {
    expect(ACTION_ITEM_TRANSITIONS['cancelled']).toContain('open');
  });
});

// ── SoD Rules ───────────────────────────────────────────────────

describe('Action SoD Rules', () => {
  it('has 3 SoD rules', () => {
    expect(ACTION_SOD_RULES).toHaveLength(3);
  });

  it('assignee_verifier rule is critical severity', () => {
    const rule = ACTION_SOD_RULES.find(r => r.ruleCode === 'action.assignee_verifier');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('critical');
    expect(rule!.enforcement).toBe('hard_block');
  });

  it('creator_closer rule is high severity with block enforcement', () => {
    const rule = ACTION_SOD_RULES.find(r => r.ruleCode === 'action.creator_closer');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('high');
    expect(rule!.enforcement).toBe('block');
  });

  it('writer_deleter rule is high severity with block enforcement', () => {
    const rule = ACTION_SOD_RULES.find(r => r.ruleCode === 'action.writer_deleter');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('high');
    expect(rule!.enforcement).toBe('block');
  });
});

// ── Permissions ─────────────────────────────────────────────────

describe('Action Permissions', () => {
  it('has exactly 15 permissions', () => {
    expect(ACTION_PERMISSIONS).toHaveLength(15);
  });

  it('all permission codes use dot notation', () => {
    for (const perm of ACTION_PERMISSIONS) {
      expect(perm.permissionCode).toMatch(/^[a-z]+\.[a-z_]+\.[a-z]+$/);
    }
  });

  it('action.item.delete is sensitive', () => {
    const perm = ACTION_PERMISSIONS.find(p => p.permissionCode === 'action.item.delete');
    expect(perm).toBeDefined();
    expect(perm!.sensitive).toBe(true);
  });

  it('action.item.verify is sensitive', () => {
    const perm = ACTION_PERMISSIONS.find(p => p.permissionCode === 'action.item.verify');
    expect(perm).toBeDefined();
    expect(perm!.sensitive).toBe(true);
  });

  it('action.item.close is sensitive', () => {
    const perm = ACTION_PERMISSIONS.find(p => p.permissionCode === 'action.item.close');
    expect(perm).toBeDefined();
    expect(perm!.sensitive).toBe(true);
  });
});

// ── Roles ───────────────────────────────────────────────────────

describe('Action Roles', () => {
  it('has exactly 8 roles', () => {
    expect(ACTION_ROLES).toHaveLength(8);
  });

  it('viewer role has only read permission and is default', () => {
    const viewer = ACTION_ROLES.find(r => r.roleCode === 'action.viewer');
    expect(viewer).toBeDefined();
    expect(viewer!.isDefault).toBe(true);
    expect(viewer!.permissions).toEqual(['action.item.read']);
  });

  it('approver role has read, verify, close, reopen, and export', () => {
    const approver = ACTION_ROLES.find(r => r.roleCode === 'action.approver');
    expect(approver).toBeDefined();
    expect(approver!.permissions).toEqual(
      expect.arrayContaining(['action.item.read', 'action.item.verify', 'action.item.close', 'action.item.reopen', 'action.item.export']),
    );
    expect(approver!.permissions).toHaveLength(5);
  });

  it('executive_owner has all 15 permissions', () => {
    const owner = ACTION_ROLES.find(r => r.roleCode === 'action.executive_owner');
    expect(owner).toBeDefined();
    expect(owner!.permissions).toHaveLength(15);
  });

  it('module_lead excludes configure and manage', () => {
    const lead = ACTION_ROLES.find(r => r.roleCode === 'action.module_lead');
    expect(lead).toBeDefined();
    expect(lead!.permissions).not.toContain('action.item.configure');
    expect(lead!.permissions).not.toContain('admin.system.manage');
  });

  it('only one role is default', () => {
    const defaults = ACTION_ROLES.filter(r => r.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].roleCode).toBe('action.viewer');
  });
});

// ── Actions ─────────────────────────────────────────────────────

describe('Action Actions', () => {
  it('has exactly 15 actions', () => {
    expect(ACTION_ACTIONS).toHaveLength(15);
  });

  it('verify action requires workflow and approval', () => {
    const verify = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.verify');
    expect(verify).toBeDefined();
    expect(verify!.requiresWorkflow).toBe(true);
    expect(verify!.requiresApproval).toBe(true);
    expect(verify!.requiresHumanReview).toBe(true);
    expect(verify!.sodSensitive).toBe(true);
  });

  it('close action requires workflow and approval', () => {
    const close = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.close');
    expect(close).toBeDefined();
    expect(close!.requiresWorkflow).toBe(true);
    expect(close!.requiresApproval).toBe(true);
    expect(close!.requiresHumanReview).toBe(true);
    expect(close!.sodSensitive).toBe(true);
  });

  it('delete action is destructive and AI-blocked', () => {
    const del = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.delete');
    expect(del).toBeDefined();
    expect(del!.dangerLevel).toBe('destructive');
    expect(del!.aiBlocked).toBe(true);
  });

  it('read action has advisory AI classification', () => {
    const read = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.read');
    expect(read).toBeDefined();
    expect(read!.aiClassification).toBe('advisory');
  });

  it('write action has pre_screen AI classification', () => {
    const write = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.write');
    expect(write).toBeDefined();
    expect(write!.aiClassification).toBe('pre_screen');
  });

  it('configure action has autonomous AI classification', () => {
    const configure = ACTION_ACTIONS.find(a => a.actionCode === 'action.item.configure');
    expect(configure).toBeDefined();
    expect(configure!.aiClassification).toBe('autonomous');
  });

  it('manage action has autonomous AI classification', () => {
    const manage = ACTION_ACTIONS.find(a => a.actionCode === 'admin.system.manage');
    expect(manage).toBeDefined();
    expect(manage!.aiClassification).toBe('autonomous');
  });
});

// ── Approval Matrix ─────────────────────────────────────────────

describe('Action Approval Matrix', () => {
  it('has 9 approval rules', () => {
    expect(ACTION_APPROVAL_MATRIX).toHaveLength(9);
  });

  it('open->in_progress allows auto-approve', () => {
    const rule = ACTION_APPROVAL_MATRIX.find(
      r => r.fromStatus === 'open' && r.toStatus === 'in_progress',
    );
    expect(rule).toBeDefined();
    expect(rule!.autoApproveAllowed).toBe(true);
  });

  it('completed->verified requires evidence and SoD-sensitive approver', () => {
    const rule = ACTION_APPROVAL_MATRIX.find(
      r => r.fromStatus === 'completed' && r.toStatus === 'verified',
    );
    expect(rule).toBeDefined();
    expect(rule!.requiredRole).toBe('action.approver');
    expect(rule!.evidenceRequired).toBe(true);
  });

  it('verified->closed requires module_lead', () => {
    const rule = ACTION_APPROVAL_MATRIX.find(
      r => r.fromStatus === 'verified' && r.toStatus === 'closed',
    );
    expect(rule).toBeDefined();
    expect(rule!.requiredRole).toBe('action.module_lead');
  });
});
