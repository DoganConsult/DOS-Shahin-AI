/**
 * Co-located tests for org-scope.adapter.ts
 * Queries: organizations, business_units, departments, org_hierarchy_nodes/edges.
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

import { resolveOrgScope, expandOrgScope, expandOrgScopeFlat, isWithinOrgScope } from './org-scope.adapter';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('resolveOrgScope', () => {
  it('returns scope IDs for the user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'org-1' }, { scope_id: 'org-2' }],
      rowCount: 2,
    });
    const result = await resolveOrgScope('t1', 'user-1');
    expect(result).toEqual(['org-1', 'org-2']);
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('user_role_assignments'),
      ['user-1'],
    );
  });

  it('returns empty array when user has no org assignments', async () => {
    const result = await resolveOrgScope('t1', 'user-none');
    expect(result).toEqual([]);
  });

  it('uses correct tenant schema prefix', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await resolveOrgScope('acme', 'user-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      expect.any(Array),
    );
  });
});

describe('expandOrgScope', () => {
  it('returns structured org descendants (orgs, BUs, depts, sections)', async () => {
    // 1st call: recursive org tree
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ org_id: 'org-1' }],
      rowCount: 1,
    });
    // 2nd call: business units
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ bu_id: 'bu-1' }],
      rowCount: 1,
    });
    // 3rd call: departments
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { dept_id: 'dept-1', parent_department_id: null },
        { dept_id: 'sect-1', parent_department_id: 'dept-1' },
      ],
      rowCount: 2,
    });
    const result = await expandOrgScope('t1', 'org-1');
    expect(result.orgIds).toEqual(['org-1']);
    expect(result.buIds).toEqual(['bu-1']);
    expect(result.deptIds).toEqual(['dept-1']);
    expect(result.sectionIds).toEqual(['sect-1']);
  });

  it('returns empty when org has no descendants', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ org_id: 'org-leaf' }], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no BUs
    // No dept query (buIds empty)
    const result = await expandOrgScope('t1', 'org-leaf');
    expect(result.orgIds).toEqual(['org-leaf']);
    expect(result.buIds).toEqual([]);
    expect(result.deptIds).toEqual([]);
    expect(result.sectionIds).toEqual([]);
  });
});

describe('expandOrgScopeFlat', () => {
  it('returns a flat array of all descendant IDs', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ org_id: 'org-1' }], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ bu_id: 'bu-1' }], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ dept_id: 'dept-1', parent_department_id: null }], rowCount: 1 });
    const result = await expandOrgScopeFlat('t1', 'org-1');
    expect(result).toContain('org-1');
    expect(result).toContain('bu-1');
    expect(result).toContain('dept-1');
  });
});

describe('isWithinOrgScope', () => {
  it('returns true when target org is a direct assignment', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'org-1' }],
      rowCount: 1,
    });
    const result = await isWithinOrgScope('t1', 'user-1', 'org-1');
    expect(result).toBe(true);
  });

  it('returns true when target is a descendant of a direct org', async () => {
    // resolveOrgScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'org-parent' }],
      rowCount: 1,
    });
    // expandOrgScopeFlat -> expandOrgScope calls:
    // 1. recursive org tree
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ org_id: 'org-parent' }, { org_id: 'org-child' }],
      rowCount: 2,
    });
    // 2. business units
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await isWithinOrgScope('t1', 'user-1', 'org-child');
    expect(result).toBe(true);
  });

  it('returns false when target is outside the user org scope', async () => {
    // resolveOrgScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'org-a' }],
      rowCount: 1,
    });
    // expandOrgScopeFlat
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ org_id: 'org-a' }], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await isWithinOrgScope('t1', 'user-1', 'org-b');
    expect(result).toBe(false);
  });

  it('returns false when user has no org assignments', async () => {
    const result = await isWithinOrgScope('t1', 'user-none', 'org-1');
    expect(result).toBe(false);
  });
});
