/**
 * Packs Module -- Manifest Validation Tests
 *
 * MP-36 Section 12: unit tests for module manifest compliance.
 * Verifies manifest structure matches AGENTS.md Patch 6 requirements.
 *
 * @owner DOS
 * @module packs
 */

import { describe, it, expect, vi } from 'vitest';

// Mock lifecycle-registry to prevent side-effect registration during import
vi.mock('../../platform/dos/lifecycle/lifecycle-registry', () => ({
  registerLifecycleDefinition: vi.fn(),
}));

// Mock event-bus to prevent side-effect during import
vi.mock('../platform/services/event/event-bus.service', () => ({
  eventBus: { subscribe: vi.fn() },
}));

import { PACKS_MANIFEST } from './packs.module';

describe('Packs Module Manifest', () => {
  it('has correct module code', () => {
    expect(PACKS_MANIFEST.code).toBe('packs');
  });

  it('has correct tier and category', () => {
    expect(PACKS_MANIFEST.tier).toBe('platform');
    expect(PACKS_MANIFEST.category).toBe('platform');
  });

  it('has bilingual names', () => {
    expect(PACKS_MANIFEST.nameEn).toBeTruthy();
    expect(PACKS_MANIFEST.nameAr).toBeTruthy();
  });

  it('has description in English', () => {
    expect(PACKS_MANIFEST.descriptionEn).toBeTruthy();
    expect(PACKS_MANIFEST.descriptionEn!.length).toBeGreaterThan(20);
  });

  it('declares owned tables (MP-36 Section 5)', () => {
    expect(PACKS_MANIFEST.ownedTables.length).toBeGreaterThan(0);
    expect(PACKS_MANIFEST.ownedTables).toContain('pack_installations');
    expect(PACKS_MANIFEST.ownedTables).toContain('pack_registry');
    expect(PACKS_MANIFEST.ownedTables).toContain('pack_policies');
    expect(PACKS_MANIFEST.ownedTables).toContain('tenant_pack_installations');
  });

  it('declares referenced tables', () => {
    expect(PACKS_MANIFEST.referencedTables!.length).toBeGreaterThan(0);
    expect(PACKS_MANIFEST.referencedTables).toContain('tenants');
    expect(PACKS_MANIFEST.referencedTables).toContain('modules');
  });

  it('declares aggregate roots', () => {
    expect(PACKS_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(PACKS_MANIFEST.aggregateRoots).toContain('pack_installations');
    expect(PACKS_MANIFEST.aggregateRoots).toContain('pack_registry');
  });

  it('declares published events (MP-36 Section 11)', () => {
    expect(PACKS_MANIFEST.publishedEvents.length).toBeGreaterThan(0);
    expect(PACKS_MANIFEST.publishedEvents).toContain('packs.installed');
    expect(PACKS_MANIFEST.publishedEvents).toContain('packs.updated');
    expect(PACKS_MANIFEST.publishedEvents).toContain('packs.uninstalled');
    expect(PACKS_MANIFEST.publishedEvents).toContain('packs.install_failed');
    expect(PACKS_MANIFEST.publishedEvents).toContain('packs.catalog_synced');
  });

  it('declares consumed events', () => {
    expect(PACKS_MANIFEST.consumedEvents.length).toBeGreaterThan(0);
    expect(PACKS_MANIFEST.consumedEvents).toContain('provisioning.job.started');
    expect(PACKS_MANIFEST.consumedEvents).toContain('module.activated');
    expect(PACKS_MANIFEST.consumedEvents).toContain('tenant.tier.changed');
  });

  it('declares soft dependencies', () => {
    expect(PACKS_MANIFEST.softDeps).toContain('compliance');
    expect(PACKS_MANIFEST.softDeps).toContain('policy');
    expect(PACKS_MANIFEST.softDeps).toContain('risk');
  });

  it('has security permissions wired (Law 3)', () => {
    expect(PACKS_MANIFEST.securityPermissions).toBeDefined();
    expect(PACKS_MANIFEST.securityPermissions!.length).toBeGreaterThan(0);
  });

  it('has security roles wired (Law 3)', () => {
    expect(PACKS_MANIFEST.securityRoles).toBeDefined();
    expect(PACKS_MANIFEST.securityRoles!.length).toBeGreaterThan(0);
  });

  it('has security actions wired (Law 3)', () => {
    expect(PACKS_MANIFEST.securityActions).toBeDefined();
    expect(PACKS_MANIFEST.securityActions!.length).toBeGreaterThan(0);
  });

  it('has approval rules wired (Law 3)', () => {
    expect(PACKS_MANIFEST.approvalRules).toBeDefined();
    expect(PACKS_MANIFEST.approvalRules!.length).toBeGreaterThan(0);
  });

  it('has route base defined', () => {
    expect(PACKS_MANIFEST.routeBase).toBe('/api/packs');
  });

  it('has event namespace defined', () => {
    expect(PACKS_MANIFEST.eventNamespace).toBe('packs');
  });

  it('has version following semver', () => {
    expect(PACKS_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('permission codes follow module.resource.action format', () => {
    for (const perm of PACKS_MANIFEST.securityPermissions ?? []) {
      expect(perm.permissionCode).toMatch(/^packs\.\w+(\.\w+)?$/);
    }
  });

  it('role codes follow module.archetype format', () => {
    for (const role of PACKS_MANIFEST.securityRoles ?? []) {
      expect(role.roleCode).toMatch(/^packs\.\w+$/);
    }
  });

  it('all roles reference valid permissions', () => {
    const validPermCodes = new Set(
      (PACKS_MANIFEST.securityPermissions ?? []).map(p => p.permissionCode),
    );
    for (const role of PACKS_MANIFEST.securityRoles ?? []) {
      for (const perm of role.permissions) {
        expect(validPermCodes.has(perm)).toBe(true);
      }
    }
  });

  it('declares aliases', () => {
    expect(PACKS_MANIFEST.aliases!.length).toBeGreaterThan(0);
  });
});
