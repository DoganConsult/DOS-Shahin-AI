import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import { resolveUserScope } from './scope-resolver';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [] });
});

describe('DAuth ScopeResolver', () => {
  it('returns empty scope when no assignments', async () => {
    const scope = await resolveUserScope('t1', 'u-001');
    expect(scope.tenantId).toBe('t1');
    expect(scope.organizationIds).toEqual([]);
    expect(scope.businessUnitIds).toEqual([]);
    expect(scope.departmentIds).toEqual([]);
    expect(scope.teamIds).toEqual([]);
    expect(scope.positionIds).toEqual([]);
  });

  it('populates scope arrays from assignments', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [
      { scope_type: 'organization', scope_id: 'org-1' },
      { scope_type: 'organization', scope_id: 'org-2' },
      { scope_type: 'team', scope_id: 'team-1' },
      { scope_type: 'department', scope_id: 'dept-1' },
    ] });
    const scope = await resolveUserScope('t1', 'u-001');
    expect(scope.organizationIds).toEqual(['org-1', 'org-2']);
    expect(scope.teamIds).toEqual(['team-1']);
    expect(scope.departmentIds).toEqual(['dept-1']);
    expect(scope.businessUnitIds).toEqual([]);
  });

  it('queries correct schema and user', async () => {
    await resolveUserScope('t1', 'u-001');
    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('"tenant_t1".user_role_assignments');
    expect(params).toContain('u-001');
  });
});
