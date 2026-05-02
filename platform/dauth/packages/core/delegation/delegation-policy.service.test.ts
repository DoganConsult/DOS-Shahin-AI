/**
 * Co-located tests for DAuth delegation-policy.service.
 * Covers: getDelegationPolicies, getDelegationPolicyForRole, validateDelegationRequest.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockGetTenantSecurityPolicy = vi.fn();
vi.mock('../policies/tenant-security-policy.service', () => ({
  getTenantSecurityPolicy: (...args: unknown[]) => mockGetTenantSecurityPolicy(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getDelegationPolicies,
  getDelegationPolicyForRole,
  validateDelegationRequest,
} from './delegation-policy.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockGetTenantSecurityPolicy.mockResolvedValue({
    delegationMaxDurationHours: 48,
    selfApprovalAllowed: false,
  });
});

/* ------------------------------------------------------------------ */
/*  getDelegationPolicies                                              */
/* ------------------------------------------------------------------ */
describe('getDelegationPolicies', () => {
  it('returns all active policies mapped correctly', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          policy_id: 'p1', role_code: 'grc_admin', max_duration_hours: 24,
          allowed_scopes: ['risk', 'audit'], allowed_actions: ['read', 'approve'],
          requires_approval: true, is_active: true,
        },
        {
          policy_id: 'p2', role_code: 'analyst', max_duration_hours: 8,
          allowed_scopes: ['risk'], allowed_actions: ['read'],
          requires_approval: false, is_active: true,
        },
      ],
    });

    const policies = await getDelegationPolicies('t1');

    expect(policies).toHaveLength(2);
    expect(policies[0].policyId).toBe('p1');
    expect(policies[0].roleCode).toBe('grc_admin');
    expect(policies[0].maxDurationHours).toBe(24);
    expect(policies[0].requiresApproval).toBe(true);
    expect(policies[0].isActive).toBe(true);
    expect(policies[1].requiresApproval).toBe(false);
  });

  it('returns empty array when no active policies', async () => {
    const policies = await getDelegationPolicies('t1');
    expect(policies).toHaveLength(0);
  });

  it('defaults max_duration_hours to 24 when null', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p3', role_code: 'viewer', max_duration_hours: null,
        allowed_scopes: null, allowed_actions: null,
        requires_approval: false, is_active: true,
      }],
    });

    const policies = await getDelegationPolicies('t1');

    expect(policies[0].maxDurationHours).toBe(24);
    expect(policies[0].allowedScopes).toEqual([]);
    expect(policies[0].allowedActions).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  getDelegationPolicyForRole                                         */
/* ------------------------------------------------------------------ */
describe('getDelegationPolicyForRole', () => {
  it('returns the policy for a matching role', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p1', role_code: 'grc_admin', max_duration_hours: 24,
        allowed_scopes: ['risk'], allowed_actions: ['approve'],
        requires_approval: true, is_active: true,
      }],
    });

    const policy = await getDelegationPolicyForRole('t1', 'grc_admin');

    expect(policy).not.toBeNull();
    expect(policy!.roleCode).toBe('grc_admin');
    expect(policy!.allowedScopes).toEqual(['risk']);
  });

  it('returns null when no policy exists for role', async () => {
    const policy = await getDelegationPolicyForRole('t1', 'nonexistent');
    expect(policy).toBeNull();
  });

  it('queries with correct parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getDelegationPolicyForRole('t1', 'risk_analyst');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('role_code = $1');
    expect(sql).toContain('is_active = TRUE');
    expect(params).toEqual(['risk_analyst']);
  });

  it('defaults nulls the same as getDelegationPolicies', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p4', role_code: 'viewer', max_duration_hours: null,
        allowed_scopes: null, allowed_actions: null,
        requires_approval: null, is_active: true,
      }],
    });

    const policy = await getDelegationPolicyForRole('t1', 'viewer');

    expect(policy!.maxDurationHours).toBe(24);
    expect(policy!.allowedScopes).toEqual([]);
    expect(policy!.allowedActions).toEqual([]);
    expect(policy!.requiresApproval).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  validateDelegationRequest                                          */
/* ------------------------------------------------------------------ */
describe('validateDelegationRequest', () => {
  it('returns valid when request complies with all policies', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ delegationMaxDurationHours: 48 });
    // Policy for the role
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p1', role_code: 'admin', max_duration_hours: 24,
        allowed_scopes: ['risk', 'audit'], allowed_actions: ['read'],
        requires_approval: false, is_active: true,
      }],
    });

    const result = await validateDelegationRequest('t1', ['admin'], ['risk'], 12);

    expect(result.valid).toBe(true);
    expect(result.reason).toBe('policy_compliant');
  });

  it('rejects when duration exceeds tenant security policy max', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ delegationMaxDurationHours: 8 });

    const result = await validateDelegationRequest('t1', ['admin'], ['risk'], 24);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('duration_exceeds_max');
    expect(result.reason).toContain('8h');
  });

  it('rejects when duration exceeds role-specific policy max', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ delegationMaxDurationHours: 48 });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p1', role_code: 'admin', max_duration_hours: 4,
        allowed_scopes: ['risk'], allowed_actions: ['read'],
        requires_approval: false, is_active: true,
      }],
    });

    const result = await validateDelegationRequest('t1', ['admin'], ['risk'], 8);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('duration_exceeds_role_policy');
  });

  it('rejects when requested scopes are not allowed', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ delegationMaxDurationHours: 48 });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        policy_id: 'p1', role_code: 'admin', max_duration_hours: 24,
        allowed_scopes: ['risk'], allowed_actions: ['read'],
        requires_approval: false, is_active: true,
      }],
    });

    const result = await validateDelegationRequest('t1', ['admin'], ['risk', 'finance'], 4);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('scope_not_allowed');
    expect(result.reason).toContain('finance');
  });

  it('passes validation when role has no specific policy', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ delegationMaxDurationHours: 48 });
    // No policy for role (empty rows)
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const result = await validateDelegationRequest('t1', ['unknown_role'], ['risk'], 4);

    expect(result.valid).toBe(true);
    expect(result.reason).toBe('policy_compliant');
  });
});
