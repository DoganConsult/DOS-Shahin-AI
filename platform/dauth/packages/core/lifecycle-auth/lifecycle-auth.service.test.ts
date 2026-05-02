import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

// Mock the approval-matrix module so we can control checkActorAuthority responses
const mockCheckActorAuthority = vi.fn();
vi.mock('../authority/approval-matrix.service', () => ({
  checkActorAuthority: (...args: unknown[]) => mockCheckActorAuthority(...args),
}));

// Mock the self-approval guard
const mockCheckSelfApproval = vi.fn();
vi.mock('./self-approval.guard', () => ({
  checkSelfApproval: (...args: unknown[]) => mockCheckSelfApproval(...args),
}));

import { evaluateLifecycleTransition } from './lifecycle-auth.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('module_lifecycle_transitions')) return { rows: [{ required_permission_code: null, authority_gate: null, sod_check: false, required_functional_roles: [] }] };
    if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
    if (sql.includes('sod_rules')) return { rows: [] };
    return { rows: [] };
  });
  // Default: actor can approve
  mockCheckActorAuthority.mockResolvedValue({
    canApprove: true,
    requiredApprovals: [],
    actorAuthorityCodes: ['approve_high'],
    reason: 'Actor holds required approval authority',
  });
  // Default: self-approval guard allows (different actor)
  mockCheckSelfApproval.mockResolvedValue({ allowed: true, reason: 'different_actor' });
});

describe('DAuth LifecycleAuthService', () => {
  const base = { moduleCode: 'risk', entityType: 'risk', entityId: 'r1', fromState: 'draft', toState: 'active', permissionCode: 'risk.record.approve', userRoles: ['risk_owner'] };

  it('allows valid transition', async () => {
    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(true);
    expect(r.checks.transitionValid).toBe(true);
    expect(r.checks.permissionValid).toBe(true);
  });

  it('denies undefined transition', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [] };
      return { rows: [] };
    });
    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(false);
    expect(r.checks.transitionValid).toBe(false);
  });

  it('denies when role lacks permission', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ required_permission_code: 'risk.record.approve' }] };
      if (sql.includes('role_permissions')) return { rows: [] };
      return { rows: [] };
    });
    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(false);
    expect(r.checks.permissionValid).toBe(false);
  });

  it('blocks self-approval when required', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ sod_check: true }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });
    const r = await evaluateLifecycleTransition('t1', 'u1', { ...base, ownerId: 'u1' });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('self-approval');
  });

  it('blocks self-approval via guard when ownerId not provided', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ sod_check: true }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });
    // Guard detects that the actor is the entity creator via DB query
    mockCheckSelfApproval.mockResolvedValueOnce({ allowed: false, reason: 'self_approval_blocked' });

    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('self-approval');
    expect(r.checks.ownershipValid).toBe(false);
    // Guard was called with correct arguments
    expect(mockCheckSelfApproval).toHaveBeenCalledWith('t1', 'u1', 'risk', 'r1', 'active');
  });

  it('allows transition when guard confirms different actor', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ sod_check: true }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });
    mockCheckSelfApproval.mockResolvedValueOnce({ allowed: true, reason: 'different_actor' });

    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(true);
    expect(r.checks.ownershipValid).toBe(true);
  });

  // ── Approval matrix integration tests ───────────────────────────────────

  it('calls checkActorAuthority when authority_gate is set', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ required_permission_code: null, authority_gate: 'approve_high', sod_check: false, required_functional_roles: [] }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('authority_levels') && sql.includes('user_role_assignments')) return { rows: [{ rank: 10 }] };
      if (sql.includes('authority_levels')) return { rows: [{ rank: 5 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });

    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(true);
    expect(r.checks.approvalRequired).toBe(true);
    expect(r.checks.approvalSatisfied).toBe(true);
    expect(mockCheckActorAuthority).toHaveBeenCalledWith(
      't1', 'u1', 'risk.risk.active', 'risk', undefined,
    );
  });

  it('denies transition when approval required but actor lacks authority', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ required_permission_code: null, authority_gate: 'approve_high', sod_check: false, required_functional_roles: [] }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('authority_levels') && sql.includes('user_role_assignments')) return { rows: [{ rank: 10 }] };
      if (sql.includes('authority_levels')) return { rows: [{ rank: 5 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });
    mockCheckActorAuthority.mockResolvedValue({
      canApprove: false,
      requiredApprovals: [{ authorityCode: 'approve_high', minApprovals: 1, valueThreshold: null }],
      actorAuthorityCodes: [],
      reason: 'Actor lacks required authority. Needed: approve_high. Has: none',
    });

    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(false);
    expect(r.checks.approvalRequired).toBe(true);
    expect(r.checks.approvalSatisfied).toBe(false);
    expect(r.requiredApprovalAuthorities).toEqual(['approve_high']);
    expect(r.reason).toContain('Approval required');
  });

  it('passes entityValue to checkActorAuthority for threshold-based approval', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_lifecycle_transitions')) return { rows: [{ required_permission_code: null, authority_gate: 'approve_high', sod_check: false, required_functional_roles: [] }] };
      if (sql.includes('role_permissions')) return { rows: [{ id: 1 }] };
      if (sql.includes('authority_levels') && sql.includes('user_role_assignments')) return { rows: [{ rank: 10 }] };
      if (sql.includes('authority_levels')) return { rows: [{ rank: 5 }] };
      if (sql.includes('sod_rules')) return { rows: [] };
      return { rows: [] };
    });

    await evaluateLifecycleTransition('t1', 'u1', { ...base, entityValue: 50000 });
    expect(mockCheckActorAuthority).toHaveBeenCalledWith(
      't1', 'u1', 'risk.risk.active', 'risk', 50000,
    );
  });

  it('does not call checkActorAuthority when requires_approval is false', async () => {
    const r = await evaluateLifecycleTransition('t1', 'u1', base);
    expect(r.allowed).toBe(true);
    expect(r.checks.approvalRequired).toBe(false);
    expect(mockCheckActorAuthority).not.toHaveBeenCalled();
  });
});
