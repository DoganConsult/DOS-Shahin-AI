/**
 * DORA Module — Manifest Validation Tests
 *
 * MP-25 §12: Unit tests for module manifest compliance.
 * Verifies manifest structure matches AGENTS.md Patch 6 requirements.
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { DORA_MANIFEST } from './dora.module';

describe('DORA Module Manifest', () => {
  it('has correct module code', () => {
    expect(DORA_MANIFEST.code).toBe('dora');
  });

  it('has correct tier and category', () => {
    expect(DORA_MANIFEST.tier).toBe('full');
    expect(DORA_MANIFEST.category).toBe('operational');
  });

  it('has bilingual names', () => {
    expect(DORA_MANIFEST.nameEn).toBeTruthy();
    expect(DORA_MANIFEST.nameAr).toBeTruthy();
  });

  it('declares owned tables (MP-25 §5)', () => {
    expect(DORA_MANIFEST.ownedTables.length).toBeGreaterThan(0);
    expect(DORA_MANIFEST.ownedTables).toContain('dora_ict_assets');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_resilience_tests');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_major_incidents');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_threat_intel');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_backup_configs');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_obligations');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_obligation_mappings');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_framework_mappings');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_control_mappings');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_resilience_results');
    expect(DORA_MANIFEST.ownedTables).toContain('dora_readiness_snapshots');
  });

  it('declares aggregate roots', () => {
    expect(DORA_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(DORA_MANIFEST.aggregateRoots).toContain('dora_ict_assets');
    expect(DORA_MANIFEST.aggregateRoots).toContain('dora_resilience_tests');
    expect(DORA_MANIFEST.aggregateRoots).toContain('dora_major_incidents');
  });

  it('declares published events', () => {
    expect(DORA_MANIFEST.publishedEvents.length).toBeGreaterThan(0);
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.ict_asset_created');
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.resilience_test_created');
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.resilience_test_completed');
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.major_incident_reported');
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.obligation_created');
    expect(DORA_MANIFEST.publishedEvents).toContain('dora.obligation_overdue');
  });

  it('declares consumed events', () => {
    expect(DORA_MANIFEST.consumedEvents.length).toBeGreaterThan(0);
    expect(DORA_MANIFEST.consumedEvents).toContain('risk.residual_high');
    expect(DORA_MANIFEST.consumedEvents).toContain('incident.classified');
  });

  it('declares dependencies', () => {
    expect(DORA_MANIFEST.hardDeps.length).toBeGreaterThan(0);
    expect(DORA_MANIFEST.hardDeps).toContain('risk');
    expect(DORA_MANIFEST.hardDeps).toContain('asset');
  });

  it('has security permissions wired (Law 3)', () => {
    expect(DORA_MANIFEST.securityPermissions).toBeDefined();
    expect(DORA_MANIFEST.securityPermissions!.length).toBeGreaterThan(0);
  });

  it('has security roles wired (Law 3)', () => {
    expect(DORA_MANIFEST.securityRoles).toBeDefined();
    expect(DORA_MANIFEST.securityRoles!.length).toBeGreaterThan(0);
  });

  it('has approval rules wired (Law 3)', () => {
    expect(DORA_MANIFEST.approvalRules).toBeDefined();
    expect(DORA_MANIFEST.approvalRules!.length).toBeGreaterThan(0);
  });

  it('has route base defined', () => {
    expect(DORA_MANIFEST.routeBase).toBe('/api/dora');
  });

  it('has event namespace defined', () => {
    expect(DORA_MANIFEST.eventNamespace).toBe('dora');
  });

  it('permission codes follow module.resource.action format', () => {
    for (const perm of DORA_MANIFEST.securityPermissions ?? []) {
      expect(perm.permissionCode).toMatch(/^dora\.\w+(\.\w+)?$/);
    }
  });

  it('has AI capabilities declared (MP-25 §8)', () => {
    expect(DORA_MANIFEST.aiEnabled).toBe(true);
    expect(DORA_MANIFEST.aiCapabilities).toBeDefined();
    expect(DORA_MANIFEST.aiCapabilities!.length).toBeGreaterThan(0);
  });

  it('has feature flags declared', () => {
    expect(DORA_MANIFEST.featureFlags).toBeDefined();
    expect(DORA_MANIFEST.featureFlags!.length).toBeGreaterThan(0);
  });

  it('has admin surfaces declared', () => {
    expect(DORA_MANIFEST.adminSurfaces).toBeDefined();
    expect(DORA_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
  });
});
