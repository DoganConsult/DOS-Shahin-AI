/**
 * Co-located tests for team-scope.adapter.ts
 * Queries: teams, team_members tables for membership and hierarchy.
 * @owner DAuth
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { resolveTeamScope, resolveTeamMembership, getTeamMembers, expandTeamScope, isWithinTeamScope } from './team-scope.adapter';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('resolveTeamScope', () => {
  it('returns team scope IDs for the user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'team-1' }, { scope_id: 'team-2' }],
      rowCount: 2,
    });
    const result = await resolveTeamScope('t1', 'user-1');
    expect(result).toEqual(['team-1', 'team-2']);
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining("scope_type = 'team'"),
      ['user-1'],
    );
  });

  it('returns empty array when user belongs to no teams', async () => {
    const result = await resolveTeamScope('t1', 'user-none');
    expect(result).toEqual([]);
  });

  it('queries the correct tenant schema', async () => {
    await resolveTeamScope('acme', 'user-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      expect.any(Array),
    );
  });
});

describe('resolveTeamMembership', () => {
  it('returns teams from team_members table with roles', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { team_id: 'team-1', team_role: 'lead' },
        { team_id: 'team-2', team_role: 'member' },
      ],
      rowCount: 2,
    });
    const result = await resolveTeamMembership('t1', 'user-1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ teamId: 'team-1', teamRole: 'lead' });
  });
});

describe('getTeamMembers', () => {
  it('returns user IDs with team roles from team_members table', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 'u-1', team_role: 'lead' },
        { user_id: 'u-2', team_role: 'member' },
        { user_id: 'u-3', team_role: 'member' },
      ],
      rowCount: 3,
    });
    const result = await getTeamMembers('t1', 'team-1');
    expect(result).toHaveLength(3);
    expect(result[0].userId).toBe('u-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('team_members'),
      ['team-1'],
    );
  });

  it('returns empty array for a team with no members', async () => {
    const result = await getTeamMembers('t1', 'team-empty');
    expect(result).toEqual([]);
  });
});

describe('expandTeamScope', () => {
  it('returns team and all child teams via parent_team_id', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ team_id: 'team-1' }, { team_id: 'team-1a' }, { team_id: 'team-1b' }],
      rowCount: 3,
    });
    const result = await expandTeamScope('t1', 'team-1');
    expect(result).toEqual(['team-1', 'team-1a', 'team-1b']);
  });

  it('returns only the root team when there are no children', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ team_id: 'team-leaf' }],
      rowCount: 1,
    });
    const result = await expandTeamScope('t1', 'team-leaf');
    expect(result).toEqual(['team-leaf']);
  });
});

describe('isWithinTeamScope', () => {
  it('returns true when user has direct role-assignment for the team', async () => {
    // resolveTeamScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'team-a' }, { scope_id: 'team-b' }],
      rowCount: 2,
    });
    const result = await isWithinTeamScope('t1', 'user-1', 'team-b');
    expect(result).toBe(true);
  });

  it('returns true when target is a child of an assigned team', async () => {
    // resolveTeamScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'team-parent' }],
      rowCount: 1,
    });
    // expandTeamScope for team-parent
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ team_id: 'team-parent' }, { team_id: 'team-child' }],
      rowCount: 2,
    });
    const result = await isWithinTeamScope('t1', 'user-1', 'team-child');
    expect(result).toBe(true);
  });

  it('returns true when user is a member via team_members', async () => {
    // resolveTeamScope (no assignments)
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // resolveTeamMembership
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ team_id: 'team-x', team_role: 'member' }],
      rowCount: 1,
    });
    const result = await isWithinTeamScope('t1', 'user-1', 'team-x');
    expect(result).toBe(true);
  });

  it('returns false when user does not belong to the target team', async () => {
    // resolveTeamScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'team-a' }],
      rowCount: 1,
    });
    // expandTeamScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ team_id: 'team-a' }],
      rowCount: 1,
    });
    // resolveTeamMembership
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await isWithinTeamScope('t1', 'user-1', 'team-x');
    expect(result).toBe(false);
  });

  it('returns false when user has no team assignments or membership', async () => {
    // resolveTeamScope
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // resolveTeamMembership
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await isWithinTeamScope('t1', 'user-none', 'team-1');
    expect(result).toBe(false);
  });
});
