/**
 * Pure-adapter proof — runs under the root vitest config (environment: 'node'),
 * independent of Angular TestBed / jsdom.
 *
 * These tests guard the contract-normalization boundary for the Permission
 * Matrix page. They specifically prove:
 *   (1) Legacy `profiles` shape is NOT silently accepted (drift surfaces).
 *   (2) Non-array permission payloads NEVER leak as rendered strings.
 *
 * If the adapters drift back toward multi-shape guessing or fallback data,
 * these tests fail in CI.
 */
import { describe, it, expect } from 'vitest';
import { normalizeFoundationRoles, normalizeRolePermissions } from './foundation-permission-matrix.adapters';

describe('normalizeFoundationRoles (permission-matrix adapter)', () => {
  it('returns [] for null / undefined / non-object / missing key', () => {
    expect(normalizeFoundationRoles(null)).toEqual([]);
    expect(normalizeFoundationRoles(undefined)).toEqual([]);
    expect(normalizeFoundationRoles('x')).toEqual([]);
    expect(normalizeFoundationRoles({})).toEqual([]);
  });

  it('rejects the legacy `profiles` shape — only the typed `roles` key is accepted', () => {
    // Proves the previous silent-fallback multi-shape guess is removed.
    expect(normalizeFoundationRoles({ profiles: [{ code: 'stale' }] })).toEqual([]);
  });

  it('extracts the typed `roles` field', () => {
    const res = { roles: [{ code: 'admin' }, { code: 'auditor' }] };
    expect(normalizeFoundationRoles(res).map((r) => r.code)).toEqual(['admin', 'auditor']);
  });
});

describe('normalizeRolePermissions (permission-matrix adapter)', () => {
  it('returns [] for null / undefined / non-object / missing key / non-array permissions', () => {
    expect(normalizeRolePermissions(null)).toEqual([]);
    expect(normalizeRolePermissions(undefined)).toEqual([]);
    expect(normalizeRolePermissions({})).toEqual([]);
    expect(normalizeRolePermissions({ permissions: 'nope' })).toEqual([]);
    expect(normalizeRolePermissions({ permissions: { notArray: true } })).toEqual([]);
  });

  it('stringifies array entries defensively', () => {
    expect(normalizeRolePermissions({ permissions: ['a', 42, true, null] })).toEqual(['a', '42', 'true', 'null']);
  });
});
