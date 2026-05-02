/**
 * Co-located tests for DAuth self-approval.guard.
 * Covers: checkSelfApproval, isSelfApprovalAllowed, getEntityCreator.
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

const mockLogAuthDecision = vi.fn();
vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: (...args: unknown[]) => mockLogAuthDecision(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  checkSelfApproval,
  isSelfApprovalAllowed,
  getEntityCreator,
} from './self-approval.guard';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockLogAuthDecision.mockResolvedValue(undefined);
  mockGetTenantSecurityPolicy.mockResolvedValue({
    selfApprovalAllowed: false,
    delegationMaxDurationHours: 48,
  });
});

/* ------------------------------------------------------------------ */
/*  checkSelfApproval                                                  */
/* ------------------------------------------------------------------ */
describe('checkSelfApproval', () => {
  it('allows when tenant policy permits self-approval', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ selfApprovalAllowed: true });

    const result = await checkSelfApproval('t1', 'u1', 'risks', 'risk-1', 'approve');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('self_approval_allowed_by_policy');
    // Should not query the entity table since policy allows it
    expect(mockSafeQuery).not.toHaveBeenCalled();
  });

  it('allows when actor is not the entity creator', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ created_by: 'other-user' }],
    });

    const result = await checkSelfApproval('t1', 'u1', 'risks', 'risk-1', 'approve');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('different_actor');
  });

  it('denies when actor is the entity creator', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ created_by: 'u1' }],
    });

    const result = await checkSelfApproval('t1', 'u1', 'risks', 'risk-1', 'approve');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('self_approval_blocked');
    expect(mockLogAuthDecision).toHaveBeenCalledWith('t1', expect.objectContaining({
      userId: 'u1',
      decision: 'deny',
      reason: 'self_approval_blocked',
    }));
  });

  it('allows when entity is not found (skips check)', async () => {
    // Empty rows means entity not found
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const result = await checkSelfApproval('t1', 'u1', 'risks', 'missing-id', 'approve');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('entity_not_found_skipping_check');
  });

  it('logs denial with correct context', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ created_by: 'actor-5' }] });

    await checkSelfApproval('t1', 'actor-5', 'controls', 'ctrl-1', 'approve');

    expect(mockLogAuthDecision).toHaveBeenCalledWith('t1', expect.objectContaining({
      permissionCode: 'self_approval:controls.approve',
      context: { entityType: 'controls', entityId: 'ctrl-1', action: 'approve' },
    }));
  });
});

/* ------------------------------------------------------------------ */
/*  isSelfApprovalAllowed                                              */
/* ------------------------------------------------------------------ */
describe('isSelfApprovalAllowed', () => {
  it('returns true when tenant policy allows self-approval', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ selfApprovalAllowed: true });

    const allowed = await isSelfApprovalAllowed('t1');
    expect(allowed).toBe(true);
  });

  it('returns false when tenant policy disallows self-approval', async () => {
    mockGetTenantSecurityPolicy.mockResolvedValueOnce({ selfApprovalAllowed: false });

    const allowed = await isSelfApprovalAllowed('t1');
    expect(allowed).toBe(false);
  });

  it('calls getTenantSecurityPolicy with correct tenantId', async () => {
    await isSelfApprovalAllowed('t42');

    expect(mockGetTenantSecurityPolicy).toHaveBeenCalledWith('t42');
  });
});

/* ------------------------------------------------------------------ */
/*  getEntityCreator                                                   */
/* ------------------------------------------------------------------ */
describe('getEntityCreator', () => {
  it('returns creator id when entity exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ created_by: 'creator-1' }],
    });

    const creator = await getEntityCreator('t1', 'risks', 'risk-1');
    expect(creator).toBe('creator-1');
  });

  it('returns null when entity not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const creator = await getEntityCreator('t1', 'risks', 'nonexistent');
    expect(creator).toBeNull();
  });

  it('returns null on query error', async () => {
    mockSafeQuery.mockRejectedValueOnce(new Error('table does not exist'));

    const creator = await getEntityCreator('t1', 'bad_table', 'id-1');
    expect(creator).toBeNull();
  });

  it('queries correct schema and table', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ created_by: 'c1' }] });

    await getEntityCreator('t1', 'controls', 'ctrl-5');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('"tenant_t1".controls');
    expect(params).toEqual(['ctrl-5']);
  });
});
