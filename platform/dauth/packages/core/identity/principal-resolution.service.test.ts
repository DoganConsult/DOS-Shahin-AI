import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./token.service', () => ({
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'valid-token') return { userId: 'u-001', tenantId: 't-1' };
    if (token === 'no-user-token') return { tenantId: 't-1' };
    throw new Error('INVALID_TOKEN');
  }),
}));

import {
  resolvePrincipal,
  resolvePrincipalFromToken,
  enrichPrincipal,
  validatePrincipal,
  invalidatePrincipalCache,
} from './principal-resolution.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  // Clear the internal principal cache
  invalidatePrincipalCache('u-001', 't-1');
  invalidatePrincipalCache('u-002', 't-1');
});

describe('DAuth PrincipalResolution — resolvePrincipal', () => {
  it('returns null when user not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await resolvePrincipal('u-missing', 't-1');
    expect(result).toBeNull();
  });

  it('returns null when user has no active tenant membership', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-001', email: 'test@acme.com', tenant_id: 't-1',
        role: 'viewer', status: 'active', name: 'Test', language: 'en',
        mfa_enabled: false, last_login_at: null, user_type: 'human',
      }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no membership
    const result = await resolvePrincipal('u-001', 't-1');
    expect(result).toBeNull();
  });

  it('maps database rows to PrincipalIdentity', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-001', email: 'admin@acme.com', tenant_id: 't-1',
        role: 'admin', status: 'active', name: 'Admin User', language: 'en',
        mfa_enabled: true, last_login_at: '2026-04-01', user_type: 'human',
      }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'active', membership_type: 'owner', role: 'admin' }],
    });

    const result = await resolvePrincipal('u-001', 't-1');
    expect(result).not.toBeNull();
    expect(result?.userId).toBe('u-001');
    expect(result?.email).toBe('admin@acme.com');
    expect(result?.principalType).toBe('human');
    expect(result?.mfaEnabled).toBe(true);
  });

  it('detects service_account principal type', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'sa-001', email: 'svc@acme.com', tenant_id: 't-1',
        role: 'service', status: 'active', name: 'Service Bot', language: 'en',
        mfa_enabled: false, last_login_at: null, user_type: 'service_account',
      }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'active', membership_type: 'service', role: 'service' }],
    });

    const result = await resolvePrincipal('sa-001', 't-1');
    expect(result?.principalType).toBe('service_account');
  });

  it('detects agent principal type', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'ag-001', email: 'agent@acme.com', tenant_id: 't-1',
        role: 'agent', status: 'active', name: 'AI Agent', language: 'en',
        mfa_enabled: false, last_login_at: null, user_type: 'agent',
      }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'active', membership_type: 'agent', role: 'agent' }],
    });

    const result = await resolvePrincipal('ag-001', 't-1');
    expect(result?.principalType).toBe('agent');
  });
});

describe('DAuth PrincipalResolution — resolvePrincipalFromToken', () => {
  it('resolves principal from a valid JWT token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-001', email: 'admin@acme.com', tenant_id: 't-1',
        role: 'admin', status: 'active', name: 'Admin', language: 'en',
        mfa_enabled: false, last_login_at: null, user_type: 'human',
      }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'active', membership_type: 'member', role: 'admin' }],
    });

    const result = await resolvePrincipalFromToken('valid-token');
    expect(result.userId).toBe('u-001');
  });

  it('throws INVALID_TOKEN for bad token', async () => {
    await expect(resolvePrincipalFromToken('bad-token')).rejects.toThrow('INVALID_TOKEN');
  });

  it('throws INVALID_TOKEN when token has no userId', async () => {
    await expect(resolvePrincipalFromToken('no-user-token')).rejects.toThrow('INVALID_TOKEN');
  });

  it('throws PRINCIPAL_NOT_FOUND when user does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(resolvePrincipalFromToken('valid-token')).rejects.toThrow('PRINCIPAL_NOT_FOUND');
  });
});

describe('DAuth PrincipalResolution — enrichPrincipal', () => {
  const basePrincipal = {
    userId: 'u-001', email: 'admin@acme.com', tenantId: 't-1',
    role: 'admin', status: 'active' as const, principalType: 'human' as const,
    name: 'Admin', language: 'en', mfaEnabled: false, lastLoginAt: null,
  };

  it('enriches principal with roles', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ role_code: 'risk_manager' }, { role_code: 'compliance_officer' }],
    });
    const enriched = await enrichPrincipal(basePrincipal, ['roles']);
    expect(enriched.roles).toEqual(['risk_manager', 'compliance_officer']);
  });

  it('enriches principal with permissions', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ permission_code: 'risk.read' }, { permission_code: 'risk.write' }],
    });
    const enriched = await enrichPrincipal(basePrincipal, ['permissions']);
    expect(enriched.permissions).toEqual(['risk.read', 'risk.write']);
  });

  it('enriches with empty arrays on database error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const enriched = await enrichPrincipal(basePrincipal, ['roles', 'permissions']);
    expect(enriched.roles).toEqual([]);
    expect(enriched.permissions).toEqual([]);
  });

  it('enriches principal with scopes', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_type: 'department', scope_id: 'dept-1', role_code: 'manager' }],
    });
    const enriched = await enrichPrincipal(basePrincipal, ['scopes']);
    expect(enriched.scopes).toHaveLength(1);
    expect(enriched.scopes?.[0].scopeType).toBe('department');
  });
});

describe('DAuth PrincipalResolution — validatePrincipal', () => {
  it('returns true for active principal with active membership', async () => {
    mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const result = await validatePrincipal({
      userId: 'u-001', email: 'test@acme.com', tenantId: 't-1',
      role: 'admin', status: 'active', principalType: 'human',
      name: 'Test', language: 'en', mfaEnabled: false, lastLoginAt: null,
    });
    expect(result).toBe(true);
  });

  it('returns false for locked principal', async () => {
    const result = await validatePrincipal({
      userId: 'u-002', email: 'locked@acme.com', tenantId: 't-1',
      role: 'viewer', status: 'locked', principalType: 'human',
      name: 'Locked', language: 'en', mfaEnabled: false, lastLoginAt: null,
    });
    expect(result).toBe(false);
  });

  it('returns false when no active membership exists', async () => {
    mockQuery.mockResolvedValue({ rows: [] }); // no membership
    const result = await validatePrincipal({
      userId: 'u-003', email: 'nomember@acme.com', tenantId: 't-1',
      role: 'viewer', status: 'active', principalType: 'human',
      name: 'NoMember', language: 'en', mfaEnabled: false, lastLoginAt: null,
    });
    expect(result).toBe(false);
  });
});
