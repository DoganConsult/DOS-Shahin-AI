import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: vi.fn(),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: vi.fn(),
}));

import {
  resolvePrincipal,
  resolvePrincipalByEmail,
  validateTenantMembership,
  isPrincipalActive,
  updateLastLogin,
} from './identity.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DAuth IdentityService — resolvePrincipal', () => {
  it('returns null when no user found (deny by default)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await resolvePrincipal('nonexistent-id');
    expect(result).toBeNull();
  });

  it('maps database row to PrincipalIdentity', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: 'u-001',
        email: 'admin@test.com',
        tenant_id: 't-1',
        role: 'admin',
        status: 'active',
        name: 'Test Admin',
        language: 'en',
        mfa_enabled: true,
        last_login_at: '2026-03-29T00:00:00Z',
      }],
    });
    const result = await resolvePrincipal('u-001');
    expect(result).toEqual({
      userId: 'u-001',
      email: 'admin@test.com',
      tenantId: 't-1',
      role: 'admin',
      status: 'active',
      principalType: 'human',
      name: 'Test Admin',
      language: 'en',
      mfaEnabled: true,
      lastLoginAt: '2026-03-29T00:00:00Z',
    });
  });

  it('defaults status to active when missing', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: 'u-002',
        email: 'user@test.com',
        tenant_id: 't-1',
        role: 'viewer',
        status: null,
        name: null,
        language: null,
        mfa_enabled: false,
        last_login_at: null,
      }],
    });
    const result = await resolvePrincipal('u-002');
    expect(result?.status).toBe('active');
    expect(result?.mfaEnabled).toBe(false);
    expect(result?.lastLoginAt).toBeNull();
  });

  it('passes userId as query parameter', async () => {
    await resolvePrincipal('u-999');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('user_id = $1');
    expect(params).toEqual(['u-999']);
  });
});

describe('DAuth IdentityService — resolvePrincipalByEmail', () => {
  it('returns null when email not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await resolvePrincipalByEmail('unknown@test.com');
    expect(result).toBeNull();
  });

  it('looks up by email then resolves full principal', async () => {
    // First call: email lookup returning user_id
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u-100' }] });
    // Second call: full principal resolution
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-100',
        email: 'found@test.com',
        tenant_id: 't-1',
        role: 'editor',
        status: 'active',
        name: 'Found User',
        language: 'en',
        mfa_enabled: false,
        last_login_at: null,
      }],
    });
    const result = await resolvePrincipalByEmail('found@test.com');
    expect(result?.userId).toBe('u-100');
    expect(result?.email).toBe('found@test.com');
  });

  it('uses case-insensitive email match', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await resolvePrincipalByEmail('Admin@Test.COM');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('LOWER(email) = LOWER($1)');
  });
});

describe('DAuth IdentityService — validateTenantMembership', () => {
  it('returns false when no active membership', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await validateTenantMembership('u-001', 't-1');
    expect(result).toBe(false);
  });

  it('returns true when active membership exists', async () => {
    mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const result = await validateTenantMembership('u-001', 't-1');
    expect(result).toBe(true);
  });

  it('queries with userId and tenantId parameters', async () => {
    await validateTenantMembership('u-001', 't-2');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('tenant_user_memberships');
    expect(params).toEqual(['u-001', 't-2']);
  });
});

describe('DAuth IdentityService — isPrincipalActive', () => {
  it('returns false when principal not found (deny by default)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await isPrincipalActive('nonexistent');
    expect(result).toBe(false);
  });

  it('returns true when status is active', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: 'u-001',
        email: 'a@b.com',
        tenant_id: 't-1',
        role: 'admin',
        status: 'active',
        mfa_enabled: false,
        last_login_at: null,
      }],
    });
    const result = await isPrincipalActive('u-001');
    expect(result).toBe(true);
  });

  it('returns false when status is locked', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        user_id: 'u-002',
        email: 'b@c.com',
        tenant_id: 't-1',
        role: 'viewer',
        status: 'locked',
        mfa_enabled: false,
        last_login_at: null,
      }],
    });
    const result = await isPrincipalActive('u-002');
    expect(result).toBe(false);
  });
});

describe('DAuth IdentityService — updateLastLogin', () => {
  it('executes update query with userId', async () => {
    await updateLastLogin('u-001');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('UPDATE users');
    expect(sql).toContain('last_login_at');
    expect(params).toEqual(['u-001']);
  });

  it('does not throw on query failure (catches error)', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(updateLastLogin('u-001')).resolves.toBeUndefined();
  });

  it('increments login_count', async () => {
    await updateLastLogin('u-001');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('login_count');
  });
});
