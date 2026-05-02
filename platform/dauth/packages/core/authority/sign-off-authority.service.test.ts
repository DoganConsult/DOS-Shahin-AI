/**
 * Co-located tests for sign-off-authority.service.ts
 * @owner DAuth
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock sibling dependencies used by sign-off-authority
const mockHasDecisionAuthority = vi.fn();
vi.mock('./decision-authority.service', () => ({
  hasDecisionAuthority: (...args: unknown[]) => mockHasDecisionAuthority(...args),
}));

const mockLogAuthDecision = vi.fn();
vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: (...args: unknown[]) => mockLogAuthDecision(...args),
}));

import { getSignOffRequirements, canSignOff, recordSignOff } from './sign-off-authority.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockHasDecisionAuthority.mockResolvedValue(false);
  mockLogAuthDecision.mockResolvedValue(undefined);
});

describe('getSignOffRequirements', () => {
  it('returns the sign-off requirement when found', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'risk',
          transition_action: 'approve',
          required_authority_code: 'risk_approver',
          min_sign_offs: 2,
          requires_different_actors: true,
        },
      ],
      rowCount: 1,
    });
    const result = await getSignOffRequirements('t1', 'risk', 'approve');
    expect(result).toEqual({
      entityType: 'risk',
      transitionAction: 'approve',
      requiredAuthorityCode: 'risk_approver',
      minSignOffs: 2,
      requiresDifferentActors: true,
    });
  });

  it('returns null when no requirement exists', async () => {
    const result = await getSignOffRequirements('t1', 'control', 'archive');
    expect(result).toBeNull();
  });

  it('defaults minSignOffs to 1 when null in DB', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'policy',
          transition_action: 'publish',
          required_authority_code: 'policy_publisher',
          min_sign_offs: null,
          requires_different_actors: false,
        },
      ],
      rowCount: 1,
    });
    const result = await getSignOffRequirements('t1', 'policy', 'publish');
    expect(result!.minSignOffs).toBe(1);
  });

  it('treats non-true requires_different_actors as false', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'audit',
          transition_action: 'close',
          required_authority_code: 'auditor',
          min_sign_offs: 1,
          requires_different_actors: undefined,
        },
      ],
      rowCount: 1,
    });
    const result = await getSignOffRequirements('t1', 'audit', 'close');
    expect(result!.requiresDifferentActors).toBe(false);
  });
});

describe('canSignOff', () => {
  it('returns allowed when no sign-off requirement exists', async () => {
    // getSignOffRequirements returns null (no rows)
    const result = await canSignOff('t1', 'u1', 'control', 'c1', 'archive');
    expect(result).toEqual({ allowed: true, reason: 'no_sign_off_required' });
  });

  it('returns allowed when user has the required authority', async () => {
    // getSignOffRequirements
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'risk',
          transition_action: 'approve',
          required_authority_code: 'risk_approver',
          min_sign_offs: 1,
          requires_different_actors: false,
        },
      ],
      rowCount: 1,
    });
    mockHasDecisionAuthority.mockResolvedValueOnce(true);
    const result = await canSignOff('t1', 'u1', 'risk', 'r1', 'approve');
    expect(result).toEqual({ allowed: true, reason: 'authority_confirmed' });
  });

  it('denies and logs when user lacks required authority', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'risk',
          transition_action: 'approve',
          required_authority_code: 'risk_approver',
          min_sign_offs: 1,
          requires_different_actors: false,
        },
      ],
      rowCount: 1,
    });
    mockHasDecisionAuthority.mockResolvedValueOnce(false);
    const result = await canSignOff('t1', 'u1', 'risk', 'r1', 'approve');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires_authority');
    expect(mockLogAuthDecision).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ decision: 'deny' }),
    );
  });

  it('denies when requiresDifferentActors is set and user already signed', async () => {
    // getSignOffRequirements
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'risk',
          transition_action: 'approve',
          required_authority_code: 'risk_approver',
          min_sign_offs: 2,
          requires_different_actors: true,
        },
      ],
      rowCount: 1,
    });
    mockHasDecisionAuthority.mockResolvedValueOnce(true);
    // sign_off_log query — user already signed
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ signer_id: 'u1' }],
      rowCount: 1,
    });
    const result = await canSignOff('t1', 'u1', 'risk', 'r1', 'approve');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('already_signed_off_requires_different_actor');
  });

  it('allows when requiresDifferentActors is set but user has not signed yet', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          entity_type: 'risk',
          transition_action: 'approve',
          required_authority_code: 'risk_approver',
          min_sign_offs: 2,
          requires_different_actors: true,
        },
      ],
      rowCount: 1,
    });
    mockHasDecisionAuthority.mockResolvedValueOnce(true);
    // sign_off_log query — user has not signed
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await canSignOff('t1', 'u1', 'risk', 'r1', 'approve');
    expect(result).toEqual({ allowed: true, reason: 'authority_confirmed' });
  });
});

describe('recordSignOff', () => {
  it('inserts a sign-off log entry', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await recordSignOff('t1', 'u1', 'risk', 'r1', 'approve');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['risk', 'r1', 'approve', 'u1'],
    );
  });

  it('writes to the sign_off_log table', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await recordSignOff('t1', 'u1', 'control', 'c1', 'validate');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('sign_off_log'),
      expect.any(Array),
    );
  });

  it('does not throw on successful insert', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(recordSignOff('t1', 'u1', 'risk', 'r1', 'approve')).resolves.toBeUndefined();
  });
});
