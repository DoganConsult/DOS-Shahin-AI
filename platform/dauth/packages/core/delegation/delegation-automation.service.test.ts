import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../../platform/dos/observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('uuid', () => ({
  v4: () => 'uuid-deleg-001',
}));

import {
  processOooDelegations,
  delegateWithCompetencyCheck,
  enforceDelegationPolicy,
} from './delegation-automation.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DelegationAutomation — processOooDelegations', () => {
  it('returns zero counts when no OOO users or active delegations', async () => {
    const result = await processOooDelegations('t-1');
    expect(result.activated).toBe(0);
    expect(result.expired).toBe(0);
  });

  it('expires stale delegations and activates new ones', async () => {
    // Step 1: Expire delegations for users no longer OOO
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ id: 'd-1' }], rowCount: 1 });
    // Step 2: Expire past-valid_until delegations
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Step 3: Find OOO users needing delegation
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-ooo', ooo_until: new Date(Date.now() + 86400000),
        delegate_to_user_id: 'u-delegate',
      }],
    });
    // Step 4a: Load delegation policies
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        role_id: 'role-1', scope_type: 'tenant', scope_id: 't-1',
        max_duration_hours: 24,
      }],
    });
    // Step 4b: Check delegate has required role
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    // Step 4c: Insert delegation chain
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Step 5: Audit log
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await processOooDelegations('t-1');
    expect(result.expired).toBe(1);
    expect(result.activated).toBe(1);
  });

  it('skips delegation when delegate lacks required role', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no expired
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no stale
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 'u-ooo', ooo_until: new Date(Date.now() + 86400000),
        delegate_to_user_id: 'u-unqualified',
      }],
    });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ role_id: 'role-1', scope_type: 'tenant', scope_id: 't-1', max_duration_hours: null }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // delegate lacks role

    const result = await processOooDelegations('t-1');
    expect(result.activated).toBe(0);
  });

  it('returns partial results on error', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ id: 'd-1' }], rowCount: 1 }); // expired 1
    mockSafeQuery.mockRejectedValueOnce(new Error('db error')); // Step 2 fails

    const result = await processOooDelegations('t-1');
    expect(result.expired).toBe(1); // partial
  });
});

describe('DelegationAutomation — delegateWithCompetencyCheck', () => {
  it('returns null when no candidates qualify', async () => {
    // All candidates fail competency check
    mockSafeQuery.mockResolvedValue({ rows: [] }); // no competencies
    const result = await delegateWithCompetencyCheck(
      't-1', 'u-delegator', ['u-cand-1', 'u-cand-2'],
      ['competency.risk_assessment'],
    );
    expect(result).toBeNull();
  });

  it('skips candidate who is the delegator (self-delegation)', async () => {
    const result = await delegateWithCompetencyCheck(
      't-1', 'u-same', ['u-same'], ['comp.a'],
    );
    expect(result).toBeNull();
  });

  it('creates delegation when candidate passes all checks', async () => {
    // Candidate 1 competency check: passes
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ competency_code: 'comp.risk' }],
    });
    // SoD check: delegator roles
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ code: 'risk_manager' }],
    });
    // SoD check: no conflict
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // Circular delegation check: no circular
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT delegation chain
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Audit log
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await delegateWithCompetencyCheck(
      't-1', 'u-delegator', ['u-candidate'],
      ['comp.risk'], 'acting',
    );
    expect(result).not.toBeNull();
    expect(result?.accepted).toBe(true);
    expect(result?.delegateeUserId).toBe('u-candidate');
  });

  it('skips candidate with SoD conflict and picks next', async () => {
    // Candidate 1: passes competency
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ competency_code: 'comp.a' }] });
    // Candidate 1: delegator roles
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ code: 'role_a' }] });
    // Candidate 1: SoD conflict found
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    // Candidate 2: passes competency
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ competency_code: 'comp.a' }] });
    // Candidate 2: delegator roles
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ code: 'role_a' }] });
    // Candidate 2: no SoD conflict
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // Candidate 2: no circular delegation
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Audit
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await delegateWithCompetencyCheck(
      't-1', 'u-delegator', ['u-conflict', 'u-clean'],
      ['comp.a'],
    );
    expect(result?.delegateeUserId).toBe('u-clean');
  });

  it('skips candidate with circular delegation', async () => {
    // Candidate passes competency
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ competency_code: 'comp.a' }] });
    // Delegator roles
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no roles = no SoD issue
    // Circular delegation found
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const result = await delegateWithCompetencyCheck(
      't-1', 'u-delegator', ['u-circular'],
      ['comp.a'],
    );
    expect(result).toBeNull();
  });
});

describe('DelegationAutomation — enforceDelegationPolicy', () => {
  it('denies when no matching policy found (Law 11)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no policy
    const result = await enforceDelegationPolicy('t-1', 'admin', 'human', 'tenant');
    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('No delegation policy');
  });

  it('allows when policy exists and no violations', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        id: 'pol-1', delegator_role_code: 'admin',
        delegate_actor_type: 'human', scope_type: 'tenant',
        excluded_actions: [], allowed_actions: [],
        requires_competency: false, max_duration_hours: 24,
      }],
    });
    // Audit log
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await enforceDelegationPolicy('t-1', 'admin', 'human', 'tenant');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.policyId).toBe('pol-1');
    expect(result.maxDurationHours).toBe(24);
  });

  it('detects excluded actions violation', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        id: 'pol-1', delegator_role_code: 'admin',
        delegate_actor_type: 'human', scope_type: 'tenant',
        excluded_actions: ['user.delete', 'tenant.destroy'],
        allowed_actions: [],
        requires_competency: false, max_duration_hours: null,
      }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    const result = await enforceDelegationPolicy(
      't-1', 'admin', 'human', 'tenant',
      ['user.delete', 'user.create'],
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toContain('user.delete');
  });

  it('detects actions not in allowed list', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        id: 'pol-1', delegator_role_code: 'admin',
        delegate_actor_type: 'human', scope_type: 'tenant',
        excluded_actions: [],
        allowed_actions: ['risk.read', 'risk.write'],
        requires_competency: false, max_duration_hours: null,
      }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    const result = await enforceDelegationPolicy(
      't-1', 'admin', 'human', 'tenant',
      ['risk.read', 'audit.delete'],
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toContain('audit.delete');
  });

  it('returns failure on database error (Law 11)', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await enforceDelegationPolicy('t-1', 'admin', 'human', 'tenant');
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toContain('Policy enforcement error');
  });
});
