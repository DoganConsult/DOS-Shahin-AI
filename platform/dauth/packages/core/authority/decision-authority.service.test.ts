/**
 * Co-located tests for decision-authority.service.ts
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

import {
  getUserDecisionAuthorities,
  grantDecisionAuthority,
  revokeDecisionAuthority,
  hasDecisionAuthority,
} from './decision-authority.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('getUserDecisionAuthorities', () => {
  it('returns mapped authority objects for the user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          authority_id: 'a1',
          user_id: 'u1',
          authority_code: 'approve_risk',
          module_code: 'risk',
          scope_type: 'organization',
          scope_id: 'org-1',
          is_active: true,
          valid_from: new Date('2026-01-01'),
          valid_to: null,
        },
      ],
      rowCount: 1,
    });
    const result = await getUserDecisionAuthorities('t1', 'u1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      authorityId: 'a1',
      userId: 'u1',
      authorityCode: 'approve_risk',
      moduleCode: 'risk',
      scopeType: 'organization',
      scopeId: 'org-1',
      isActive: true,
    });
  });

  it('returns empty array when user has no authorities', async () => {
    const result = await getUserDecisionAuthorities('t1', 'u-none');
    expect(result).toEqual([]);
  });

  it('handles valid_from without toISOString gracefully', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          authority_id: 'a2',
          user_id: 'u1',
          authority_code: 'sign_off',
          module_code: null,
          scope_type: null,
          scope_id: null,
          is_active: true,
          valid_from: 'raw-string',
          valid_to: null,
        },
      ],
      rowCount: 1,
    });
    const result = await getUserDecisionAuthorities('t1', 'u1');
    expect(result[0].validFrom).toBe('');
    expect(result[0].validTo).toBeNull();
  });

  it('queries the correct schema and filters active + valid', async () => {
    await getUserDecisionAuthorities('acme', 'u1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      ['u1'],
    );
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE'),
      expect.any(Array),
    );
  });
});

describe('grantDecisionAuthority', () => {
  it('inserts authority and publishes granted event', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await grantDecisionAuthority('t1', 'u1', 'approve_risk', {
      moduleCode: 'risk',
      grantedBy: 'admin-1',
    });
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['u1', 'approve_risk', 'risk', null, null, null, 'admin-1'],
    );
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.authority.granted',
      't1',
      expect.objectContaining({ userId: 'u1', authorityCode: 'approve_risk' }),
    );
  });

  it('passes optional scope and validity parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await grantDecisionAuthority('t1', 'u1', 'sign_off', {
      scopeType: 'team',
      scopeId: 'team-1',
      validTo: '2027-01-01',
      grantedBy: 'admin-1',
    });
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['u1', 'sign_off', null, 'team', 'team-1', '2027-01-01', 'admin-1'],
    );
  });

  it('uses ON CONFLICT for upsert behavior', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await grantDecisionAuthority('t1', 'u1', 'approve_risk', { grantedBy: 'a1' });
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.any(Array),
    );
  });
});

describe('revokeDecisionAuthority', () => {
  it('returns true and publishes event when authority is revoked', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const result = await revokeDecisionAuthority('t1', 'u1', 'approve_risk', 'admin-1');
    expect(result).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.authority.revoked',
      't1',
      expect.objectContaining({ userId: 'u1', authorityCode: 'approve_risk', revokedBy: 'admin-1' }),
    );
  });

  it('returns false when no matching active authority exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await revokeDecisionAuthority('t1', 'u1', 'nonexistent', 'admin-1');
    expect(result).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('sets is_active = FALSE and valid_to = NOW()', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await revokeDecisionAuthority('t1', 'u1', 'sign_off', 'admin-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = FALSE'),
      ['u1', 'sign_off'],
    );
  });
});

describe('hasDecisionAuthority', () => {
  it('returns true when user has the authority', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const result = await hasDecisionAuthority('t1', 'u1', 'approve_risk');
    expect(result).toBe(true);
  });

  it('returns false when user does not have the authority', async () => {
    const result = await hasDecisionAuthority('t1', 'u1', 'nonexistent');
    expect(result).toBe(false);
  });

  it('applies module filter when moduleCode is provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await hasDecisionAuthority('t1', 'u1', 'approve_risk', 'risk');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('module_code = $3'),
      ['u1', 'approve_risk', 'risk'],
    );
  });

  it('omits module filter when moduleCode is not provided', async () => {
    await hasDecisionAuthority('t1', 'u1', 'approve_risk');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('module_code = $3'),
      ['u1', 'approve_risk'],
    );
  });
});
