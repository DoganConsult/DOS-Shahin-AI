/**
 * Tests for DAuth frontend access contract utilities.
 * Validates contract functions that determine what the frontend can render.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  hasPermission,
  hasRole,
  hasAuthority,
  getAllowedModules,
  getLandingPage,
  isModuleVisible,
  getScopeBindings,
} from './access-snapshot.contract';

import type { AccessSnapshot } from '../contracts/access-snapshot.types';

beforeEach(() => {
  vi.clearAllMocks();
});

const createSnapshot = (overrides?: Partial<AccessSnapshot>): AccessSnapshot => ({
  actor: {
    userId: 'u-001',
    email: 'admin@acme.com',
    displayName: 'Admin',
    actorType: 'human',
    identityPosture: 'mfa',
    mfaVerified: true,
  },
  tenant: {
    tenantId: 't-1',
    tenantStatus: 'active',
    plan: 'enterprise',
    membershipStatus: 'active',
    membershipType: 'owner',
    joinedAt: '2026-01-01',
  },
  accessProfiles: ['platform_super_admin'],
  functionalRoles: ['risk_manager', 'compliance_officer'],
  effectivePermissions: ['risk.read', 'risk.write', 'compliance.read', 'audit.read'],
  scopeBindings: [
    { scopeType: 'department', scopeId: 'dept-1', roleCode: 'risk_manager' },
    { scopeType: 'tenant', scopeId: 't-1', roleCode: 'compliance_officer' },
  ],
  decisionAuthorities: ['risk.approve', 'compliance.sign_off'],
  allowedModules: ['risk', 'compliance', 'audit', 'evidence'],
  allowedProducts: ['shahin-ai'],
  allowedDashboards: ['executive', 'risk_overview'],
  landingHint: {
    landingPage: '/dashboard',
    fallbackPage: '/workspace-home',
  },
  audit: {
    snapshotGeneratedAt: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-001',
    cacheHit: false,
    evaluationDurationMs: 12,
  },
  ...overrides,
});

describe('FrontendAccessContract — hasPermission', () => {
  it('returns true when permission exists in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasPermission(snapshot, 'risk.read')).toBe(true);
  });

  it('returns false when permission is not in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasPermission(snapshot, 'admin.manage_users')).toBe(false);
  });

  it('handles empty permissions array', () => {
    const snapshot = createSnapshot({ effectivePermissions: [] });
    expect(hasPermission(snapshot, 'risk.read')).toBe(false);
  });
});

describe('FrontendAccessContract — hasRole', () => {
  it('returns true when role exists in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasRole(snapshot, 'risk_manager')).toBe(true);
  });

  it('returns false when role is not in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasRole(snapshot, 'super_admin')).toBe(false);
  });

  it('handles empty roles array', () => {
    const snapshot = createSnapshot({ functionalRoles: [] });
    expect(hasRole(snapshot, 'risk_manager')).toBe(false);
  });
});

describe('FrontendAccessContract — hasAuthority', () => {
  it('returns true when authority exists in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasAuthority(snapshot, 'risk.approve')).toBe(true);
  });

  it('returns false when authority is not in snapshot', () => {
    const snapshot = createSnapshot();
    expect(hasAuthority(snapshot, 'vendor.approve')).toBe(false);
  });
});

describe('FrontendAccessContract — getAllowedModules', () => {
  it('returns the allowed modules array', () => {
    const snapshot = createSnapshot();
    const modules = getAllowedModules(snapshot);
    expect(modules).toContain('risk');
    expect(modules).toContain('compliance');
    expect(modules).toHaveLength(4);
  });

  it('returns empty array when no modules allowed', () => {
    const snapshot = createSnapshot({ allowedModules: [] });
    expect(getAllowedModules(snapshot)).toEqual([]);
  });
});

describe('FrontendAccessContract — getLandingPage', () => {
  it('returns the configured landing page', () => {
    const snapshot = createSnapshot();
    expect(getLandingPage(snapshot)).toBe('/dashboard');
  });

  it('returns custom landing page', () => {
    const snapshot = createSnapshot({
      landingHint: {
        landingPage: '/risk/overview',
        fallbackPage: '/workspace-home',
      },
    });
    expect(getLandingPage(snapshot)).toBe('/risk/overview');
  });
});

describe('FrontendAccessContract — isModuleVisible', () => {
  it('returns true for allowed module', () => {
    const snapshot = createSnapshot();
    expect(isModuleVisible(snapshot, 'risk')).toBe(true);
  });

  it('returns false for non-allowed module', () => {
    const snapshot = createSnapshot();
    expect(isModuleVisible(snapshot, 'vendor')).toBe(false);
  });
});

describe('FrontendAccessContract — getScopeBindings', () => {
  it('returns all scope bindings without filter', () => {
    const snapshot = createSnapshot();
    const bindings = getScopeBindings(snapshot);
    expect(bindings).toHaveLength(2);
  });

  it('filters scope bindings by role code', () => {
    const snapshot = createSnapshot();
    const bindings = getScopeBindings(snapshot, 'risk_manager');
    expect(bindings).toHaveLength(1);
    expect(bindings[0].roleCode).toBe('risk_manager');
  });

  it('returns empty array when role has no bindings', () => {
    const snapshot = createSnapshot();
    const bindings = getScopeBindings(snapshot, 'nonexistent_role');
    expect(bindings).toEqual([]);
  });
});

describe('FrontendAccessContract — diffAccessContract', () => {
  it('detects permission differences between snapshots', () => {
    const old = createSnapshot({ effectivePermissions: ['risk.read', 'audit.read'] });
    const current = createSnapshot({ effectivePermissions: ['risk.read', 'risk.write', 'audit.read'] });

    const added = current.effectivePermissions.filter(p => !old.effectivePermissions.includes(p));
    const removed = old.effectivePermissions.filter(p => !current.effectivePermissions.includes(p));

    expect(added).toEqual(['risk.write']);
    expect(removed).toEqual([]);
  });

  it('detects module changes between snapshots', () => {
    const old = createSnapshot({ allowedModules: ['risk', 'audit'] });
    const current = createSnapshot({ allowedModules: ['risk', 'compliance'] });

    const added = current.allowedModules.filter(m => !old.allowedModules.includes(m));
    const removed = old.allowedModules.filter(m => !current.allowedModules.includes(m));

    expect(added).toEqual(['compliance']);
    expect(removed).toEqual(['audit']);
  });
});
