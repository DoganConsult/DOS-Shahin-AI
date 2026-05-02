/**
 * Vendor Module -- Manifest Validation Tests
 *
 * MP-10 SS12: unit tests for module manifest compliance.
 * Verifies manifest structure matches AGENTS.md Patch 6 requirements.
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { VENDOR_MANIFEST } from './vendor.module';

describe('Vendor Module Manifest', () => {
  it('has correct module code', () => {
    expect(VENDOR_MANIFEST.code).toBe('vendor');
  });

  it('has correct tier and category', () => {
    expect(VENDOR_MANIFEST.tier).toBe('full');
    expect(VENDOR_MANIFEST.category).toBe('operational');
  });

  it('has bilingual names (Patch 6 requirement)', () => {
    expect(VENDOR_MANIFEST.nameEn).toBeTruthy();
    expect(VENDOR_MANIFEST.nameAr).toBeTruthy();
    expect(typeof VENDOR_MANIFEST.nameEn).toBe('string');
    expect(typeof VENDOR_MANIFEST.nameAr).toBe('string');
  });

  it('has bilingual descriptions', () => {
    expect(VENDOR_MANIFEST.descriptionEn).toBeTruthy();
    expect(VENDOR_MANIFEST.descriptionAr).toBeTruthy();
  });

  it('declares owned tables (MP-10 SS5)', () => {
    expect(VENDOR_MANIFEST.ownedTables.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_assessments');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_engagements');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_due_diligence');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_sla_definitions');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_findings');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_issues');
    expect(VENDOR_MANIFEST.ownedTables).toContain('vendor_risk_assessments');
  });

  it('declares aggregate roots', () => {
    expect(VENDOR_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.aggregateRoots).toContain('vendor_engagements');
    expect(VENDOR_MANIFEST.aggregateRoots).toContain('vendor_risk_assessments');
    expect(VENDOR_MANIFEST.aggregateRoots).toContain('vendor_due_diligence');
    expect(VENDOR_MANIFEST.aggregateRoots).toContain('vendor_sla_definitions');
  });

  it('declares published events', () => {
    expect(VENDOR_MANIFEST.publishedEvents.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.onboarded');
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.sla_breached');
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.risk_changed');
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.dd_completed');
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.issue_created');
    expect(VENDOR_MANIFEST.publishedEvents).toContain('vendor.offboarding_initiated');
  });

  it('declares consumed events', () => {
    expect(VENDOR_MANIFEST.consumedEvents.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.consumedEvents).toContain('risk.score_changed');
    expect(VENDOR_MANIFEST.consumedEvents).toContain('compliance.gap_detected');
    expect(VENDOR_MANIFEST.consumedEvents).toContain('audit.finding_created');
  });

  it('has hard dependencies on risk and compliance', () => {
    expect(VENDOR_MANIFEST.hardDeps).toContain('risk');
    expect(VENDOR_MANIFEST.hardDeps).toContain('compliance');
  });

  it('has soft dependencies', () => {
    expect(VENDOR_MANIFEST.softDeps.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.softDeps).toContain('evidence');
    expect(VENDOR_MANIFEST.softDeps).toContain('audit');
    expect(VENDOR_MANIFEST.softDeps).toContain('incident');
  });

  it('has security permissions wired (Law 3)', () => {
    expect(VENDOR_MANIFEST.securityPermissions).toBeDefined();
    expect(VENDOR_MANIFEST.securityPermissions!.length).toBeGreaterThan(0);
  });

  it('has security roles wired (Law 3)', () => {
    expect(VENDOR_MANIFEST.securityRoles).toBeDefined();
    expect(VENDOR_MANIFEST.securityRoles!.length).toBeGreaterThan(0);
  });

  it('has security actions wired (Law 3)', () => {
    expect(VENDOR_MANIFEST.securityActions).toBeDefined();
    expect(VENDOR_MANIFEST.securityActions!.length).toBeGreaterThan(0);
  });

  it('has approval rules wired (Law 3)', () => {
    expect(VENDOR_MANIFEST.approvalRules).toBeDefined();
  });

  it('has route base defined', () => {
    expect(VENDOR_MANIFEST.routeBase).toBe('/api/vendor');
  });

  it('has event namespace defined', () => {
    expect(VENDOR_MANIFEST.eventNamespace).toBe('vendor');
  });

  it('has table prefix defined', () => {
    expect(VENDOR_MANIFEST.tablePrefix).toBe('vendor_');
  });

  it('has AI enabled and agent binding set', () => {
    expect(VENDOR_MANIFEST.aiEnabled).toBe(true);
    expect(VENDOR_MANIFEST.agentBinding).toBe('A08');
    expect(VENDOR_MANIFEST.aiCapabilities!.length).toBeGreaterThan(0);
  });

  it('has workflow template code', () => {
    expect(VENDOR_MANIFEST.workflowTemplateCode).toBe('vendor_due_diligence');
    expect(VENDOR_MANIFEST.workflowSlaHours).toBe(336);
  });

  it('has feature flags declared', () => {
    expect(VENDOR_MANIFEST.featureFlags).toBeDefined();
    expect(VENDOR_MANIFEST.featureFlags!.length).toBeGreaterThan(0);
    expect(VENDOR_MANIFEST.featureFlags).toContain('vendor.portal');
    expect(VENDOR_MANIFEST.featureFlags).toContain('vendor.fourth_party');
  });

  it('has admin surfaces declared', () => {
    expect(VENDOR_MANIFEST.adminSurfaces).toBeDefined();
    expect(VENDOR_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
  });

  it('is marked as installable', () => {
    expect(VENDOR_MANIFEST.installable).toBe(true);
  });

  it('has version in semver format', () => {
    expect(VENDOR_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('permission codes follow module.resource.action format', () => {
    for (const perm of VENDOR_MANIFEST.securityPermissions ?? []) {
      expect(perm.permissionCode).toMatch(/^\w+\.\w+(\.\w+)?$/);
    }
  });

  it('role codes follow module.archetype format', () => {
    for (const role of VENDOR_MANIFEST.securityRoles ?? []) {
      expect(role.roleCode).toMatch(/^vendor\.\w+$/);
    }
  });

  it('all roles have at least vendor.record.read permission', () => {
    for (const role of VENDOR_MANIFEST.securityRoles ?? []) {
      expect(role.permissions).toContain('vendor.record.read');
    }
  });

  it('has provisioning order set', () => {
    expect(VENDOR_MANIFEST.provisioningOrder).toBeDefined();
    expect(typeof VENDOR_MANIFEST.provisioningOrder).toBe('number');
  });

  it('has licensing tier set', () => {
    expect(VENDOR_MANIFEST.licensingTier).toBeDefined();
    expect(VENDOR_MANIFEST.licensingTier).toBe('professional');
  });

  it('has visibility set to both (internal + external)', () => {
    expect(VENDOR_MANIFEST.visibility).toBe('both');
  });
});
