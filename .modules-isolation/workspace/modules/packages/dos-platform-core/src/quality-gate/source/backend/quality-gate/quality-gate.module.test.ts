/**
 * quality-gate — Module Manifest Tests
 * Validates manifest registration, security, events, approval matrix.
 */

import {  describe, it, expect, beforeAll , vi as _vi } from 'vitest';

// Side-effect import: registers the module
import './quality-gate.module';
import { getModuleManifest } from '@dos/module-sdk';
import { QGATE_PERMISSIONS, QGATE_ROLES, QGATE_ACTIONS } from './security/quality-gate.security';
import { QGATE_APPROVAL_MATRIX } from './security/quality-gate.approval-matrix';
import { QGATE_EVENT_CONTRACT, QGATE_PUBLISHED_EVENTS, QGATE_CONSUMED_EVENTS } from './events/quality-gate.events';
import { DEFAULT_THRESHOLDS } from './contracts/quality-gate.contracts';

describe('quality-gate module manifest', () => {
  let manifest: ReturnType<typeof getModuleManifest>;

  beforeAll(() => {
    manifest = getModuleManifest('quality-gate');
  });

  it('should be registered in the module registry', () => {
    expect(manifest).toBeDefined();
  });

  it('should have correct code and version', () => {
    expect(manifest!.code).toBe('quality-gate');
    expect(manifest!.version).toBe('1.0.0');
  });

  it('should be platform tier', () => {
    expect(manifest!.tier).toBe('platform');
    expect(manifest!.category).toBe('platform');
  });

  it('should own 7 tables with qgate_ prefix', () => {
    expect(manifest!.ownedTables).toHaveLength(7);
    for (const table of manifest!.ownedTables) {
      expect(table).toMatch(/^qgate_/);
    }
  });

  it('should reference existing platform gate tables', () => {
    expect(manifest!.referencedTables).toContain('dos_quality_gates');
    expect(manifest!.referencedTables).toContain('gate_definitions');
  });

  it('should have correct route base', () => {
    expect(manifest!.routeBase).toBe('/api/quality-gate');
  });

  it('should be enterprise tier licensing', () => {
    expect(manifest!.licensingTier).toBe('enterprise');
  });
});

describe('quality-gate security', () => {
  it('should have at least 7 permissions', () => {
    expect(QGATE_PERMISSIONS.length).toBeGreaterThanOrEqual(7);
  });

  it('all permissions should follow quality-gate.resource.action pattern', () => {
    for (const perm of QGATE_PERMISSIONS) {
      expect(perm.permissionCode).toMatch(/^quality-gate\./);
    }
  });

  it('should have at least 4 roles', () => {
    expect(QGATE_ROLES.length).toBeGreaterThanOrEqual(4);
  });

  it('executive_owner role should have all permissions', () => {
    const owner = QGATE_ROLES.find(r => r.roleCode === 'quality-gate.executive_owner');
    expect(owner).toBeDefined();
    expect(owner!.permissions.length).toBeGreaterThanOrEqual(QGATE_PERMISSIONS.length);
  });

  it('should have at least 4 actions', () => {
    expect(QGATE_ACTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('override action should require approval and be auditable', () => {
    const override = QGATE_ACTIONS.find(a => a.actionCode === 'quality-gate.run.override');
    expect(override).toBeDefined();
    expect(override!.requiresApproval).toBe(true);
    expect(override!.auditable).toBe(true);
    expect(override!.dangerLevel).toBe('destructive');
  });
});

describe('quality-gate events', () => {
  it('should publish at least 10 events', () => {
    expect(QGATE_PUBLISHED_EVENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('should consume at least 2 events', () => {
    expect(QGATE_CONSUMED_EVENTS.length).toBeGreaterThanOrEqual(2);
  });

  it('event contract module code should match', () => {
    expect(QGATE_EVENT_CONTRACT.moduleCode).toBe('quality-gate');
  });
});

describe('quality-gate approval matrix', () => {
  it('should have approval rules for run override', () => {
    const overrideRule = QGATE_APPROVAL_MATRIX.find(r => r.entityType === 'qgate_runs');
    expect(overrideRule).toBeDefined();
    expect(overrideRule!.commentsRequired).toBe(true);
    expect(overrideRule!.evidenceRequired).toBe(true);
  });
});

describe('quality-gate default thresholds', () => {
  it('should have thresholds for all 7 stages', () => {
    expect(Object.keys(DEFAULT_THRESHOLDS)).toHaveLength(7);
  });

  it('injection threshold should be 100%', () => {
    expect(DEFAULT_THRESHOLDS['ai-guardrails']['ai.injection']).toBe(1.0);
  });

  it('isolation threshold should be 100%', () => {
    expect(DEFAULT_THRESHOLDS['ai-guardrails']['ai.isolation']).toBe(1.0);
  });

  it('mutation break threshold should be 50%', () => {
    expect(DEFAULT_THRESHOLDS.mutation['mutation.score']).toBe(0.50);
  });
});
