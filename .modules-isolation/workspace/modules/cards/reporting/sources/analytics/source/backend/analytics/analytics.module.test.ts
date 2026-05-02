/**
 * Analytics Module -- Manifest Validation Tests
 *
 * MP-12 SS12: unit tests for module manifest compliance.
 * Verifies manifest structure matches AGENTS.md Patch 6 requirements.
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { ANALYTICS_MANIFEST } from './analytics.module';

describe('Analytics Module Manifest', () => {
  it('has correct module code', () => {
    expect(ANALYTICS_MANIFEST.code).toBe('analytics');
  });

  it('has correct tier and category', () => {
    expect(ANALYTICS_MANIFEST.tier).toBe('platform');
    expect(ANALYTICS_MANIFEST.category).toBe('platform');
  });

  it('has bilingual names (Patch 6 requirement)', () => {
    expect(ANALYTICS_MANIFEST.nameEn).toBeTruthy();
    expect(ANALYTICS_MANIFEST.nameAr).toBeTruthy();
    expect(typeof ANALYTICS_MANIFEST.nameEn).toBe('string');
    expect(typeof ANALYTICS_MANIFEST.nameAr).toBe('string');
  });

  it('has bilingual descriptions', () => {
    expect(ANALYTICS_MANIFEST.descriptionEn).toBeTruthy();
    expect(ANALYTICS_MANIFEST.descriptionAr).toBeTruthy();
  });

  it('declares owned tables (MP-12 SS5)', () => {
    expect(ANALYTICS_MANIFEST.ownedTables.length).toBeGreaterThan(0);
    expect(ANALYTICS_MANIFEST.ownedTables).toContain('analytics_dashboards');
    expect(ANALYTICS_MANIFEST.ownedTables).toContain('analytics_datasets');
    expect(ANALYTICS_MANIFEST.ownedTables).toContain('analytics_metrics');
  });

  it('declares aggregate roots', () => {
    expect(ANALYTICS_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(ANALYTICS_MANIFEST.aggregateRoots).toContain('analytics_dashboards');
    expect(ANALYTICS_MANIFEST.aggregateRoots).toContain('analytics_datasets');
    expect(ANALYTICS_MANIFEST.aggregateRoots).toContain('analytics_metrics');
  });

  it('declares published events', () => {
    expect(ANALYTICS_MANIFEST.publishedEvents.length).toBeGreaterThan(0);
    expect(ANALYTICS_MANIFEST.publishedEvents).toContain('analytics.kpi_snapshot_generated');
    expect(ANALYTICS_MANIFEST.publishedEvents).toContain('analytics.anomaly_detected');
    expect(ANALYTICS_MANIFEST.publishedEvents).toContain('analytics.benchmark_updated');
  });

  it('declares consumed events', () => {
    expect(ANALYTICS_MANIFEST.consumedEvents.length).toBeGreaterThan(0);
    expect(ANALYTICS_MANIFEST.consumedEvents).toContain('risk.score_changed');
    expect(ANALYTICS_MANIFEST.consumedEvents).toContain('compliance.posture_changed');
    expect(ANALYTICS_MANIFEST.consumedEvents).toContain('evidence.collected');
  });

  it('has security permissions wired (Law 3)', () => {
    expect(ANALYTICS_MANIFEST.securityPermissions).toBeDefined();
    expect(ANALYTICS_MANIFEST.securityPermissions!.length).toBeGreaterThan(0);
  });

  it('has security roles wired (Law 3)', () => {
    expect(ANALYTICS_MANIFEST.securityRoles).toBeDefined();
    expect(ANALYTICS_MANIFEST.securityRoles!.length).toBeGreaterThan(0);
  });

  it('has security actions wired (Law 3)', () => {
    expect(ANALYTICS_MANIFEST.securityActions).toBeDefined();
    expect(ANALYTICS_MANIFEST.securityActions!.length).toBeGreaterThan(0);
  });

  it('has approval rules wired (Law 3)', () => {
    expect(ANALYTICS_MANIFEST.approvalRules).toBeDefined();
  });

  it('has route base defined', () => {
    expect(ANALYTICS_MANIFEST.routeBase).toBe('/api/analytics');
  });

  it('has event namespace defined', () => {
    expect(ANALYTICS_MANIFEST.eventNamespace).toBe('analytics');
  });

  it('has table prefix defined', () => {
    expect(ANALYTICS_MANIFEST.tablePrefix).toBe('analytics_');
  });

  it('has feature flags declared', () => {
    expect(ANALYTICS_MANIFEST.featureFlags).toBeDefined();
    expect(ANALYTICS_MANIFEST.featureFlags!.length).toBeGreaterThan(0);
    expect(ANALYTICS_MANIFEST.featureFlags).toContain('analytics.custom_dashboards');
    expect(ANALYTICS_MANIFEST.featureFlags).toContain('analytics.ai_insights');
  });

  it('has admin surfaces declared', () => {
    expect(ANALYTICS_MANIFEST.adminSurfaces).toBeDefined();
    expect(ANALYTICS_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
  });

  it('is marked as installable', () => {
    expect(ANALYTICS_MANIFEST.installable).toBe(true);
  });

  it('has version in semver format', () => {
    expect(ANALYTICS_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('permission codes follow module.resource.action format', () => {
    for (const perm of ANALYTICS_MANIFEST.securityPermissions ?? []) {
      expect(perm.permissionCode).toMatch(/^\w+\.\w+(\.\w+)?$/);
    }
  });

  it('role codes follow module.archetype format', () => {
    for (const role of ANALYTICS_MANIFEST.securityRoles ?? []) {
      expect(role.roleCode).toMatch(/^analytics\.\w+$/);
    }
  });

  it('all roles have at least analytics.report.read permission', () => {
    for (const role of ANALYTICS_MANIFEST.securityRoles ?? []) {
      expect(role.permissions).toContain('analytics.report.read');
    }
  });

  it('has provisioning order set', () => {
    expect(ANALYTICS_MANIFEST.provisioningOrder).toBeDefined();
    expect(typeof ANALYTICS_MANIFEST.provisioningOrder).toBe('number');
  });

  it('has licensing tier set', () => {
    expect(ANALYTICS_MANIFEST.licensingTier).toBeDefined();
    expect(ANALYTICS_MANIFEST.licensingTier).toBe('professional');
  });
});
