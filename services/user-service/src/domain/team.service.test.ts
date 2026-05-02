import { describe, expect, it, vi, beforeEach } from 'vitest';

const { spy } = vi.hoisted(() => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  let stub: (sql: string, params?: unknown[]) => any = () => ({ rows: [], rowCount: 0 });
  const withTenantClient = async (tenantId: string, fn: (c: any) => any) => {
    const client = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ tenantId, sql, params: params ?? [] });
        const r = await stub(sql, params);
        return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0), command: '', oid: 0, fields: [] };
      },
    };
    return fn(client);
  };
  return {
    spy: {
      calls,
      setQueryStub: (next: typeof stub) => { stub = next; },
      withTenantClient,
    },
  };
});

vi.mock('@dos/db', () => ({
  withTenantClient: spy.withTenantClient,
  query: vi.fn(),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: {
    teamCreated: vi.fn(), teamMemberAdded: vi.fn(), teamMemberRemoved: vi.fn(),
    observeDb: vi.fn(),
  },
}));

import {
  listTeams, getTeamById, createTeam, updateTeam, deleteTeam,
  listMembers, addMember, removeMember,
} from './team.service';

const TENANT = 'tenant-a';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [] }));
});

describe('team.service', () => {
  it('listTeams WHERE includes tenant_id and deleted_at IS NULL', async () => {
    spy.setQueryStub((sql) => (sql.includes('COUNT') ? { rows: [{ count: '0' }] } : { rows: [] }));
    await listTeams(TENANT);
    expect(spy.calls[0].sql).toMatch(/tenant_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/deleted_at IS NULL/);
  });

  it('createTeam translates unique violation into TEAM_CODE_DUPLICATE', async () => {
    spy.setQueryStub(() => { const e = new Error('dup') as Error & { code: string }; e.code = '23505'; throw e; });
    await expect(createTeam(TENANT, { name: 'T', code: 'X', createdBy: 'u1' }))
      .rejects.toMatchObject({ code: 'TEAM_CODE_DUPLICATE', status: 409 });
  });

  it('addMember rejects when team does not belong to tenant', async () => {
    spy.setQueryStub(() => ({ rows: [] })); // team-check returns nothing
    await expect(addMember(TENANT, 'team-x', 'user-y', 'member'))
      .rejects.toMatchObject({ code: 'TEAM_NOT_FOUND', status: 404 });
  });

  it('addMember succeeds when team exists', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{}] };
      return { rows: [{ member_id: 'm1', team_id: 'team-x', user_id: 'user-y', role: 'member' }] };
    });
    const r = await addMember(TENANT, 'team-x', 'user-y', 'member');
    expect(r.member_id).toBe('m1');
  });

  it('removeMember returns false when team not in tenant (no leak)', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await removeMember(TENANT, 'team-x', 'user-y')).toBe(false);
  });

  it('listMembers returns [] when team not in tenant (no leak)', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await listMembers(TENANT, 'team-x')).toEqual([]);
  });

  it('getTeamById scopes by team_id + tenant_id + deleted_at', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await getTeamById(TENANT, 't1');
    expect(spy.calls[0].params).toEqual(['t1', TENANT]);
    expect(spy.calls[0].sql).toMatch(/team_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/tenant_id = \$2/);
    expect(spy.calls[0].sql).toMatch(/deleted_at IS NULL/);
  });

  it('updateTeam does not touch rows in other tenants', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    const r = await updateTeam(TENANT, 't1', { name: 'New' });
    expect(r).toBeNull();
    expect(spy.calls[0].params.at(-1)).toBe(TENANT);
  });

  it('deleteTeam is soft-delete (UPDATE ... deleted_at)', async () => {
    spy.setQueryStub(() => ({ rows: [{ team_id: 't1' }] }));
    const ok = await deleteTeam(TENANT, 't1');
    expect(ok).toBe(true);
    expect(spy.calls[0].sql).toMatch(/UPDATE dos\.teams/);
    expect(spy.calls[0].sql).toMatch(/deleted_at = NOW\(\)/);
  });

  it('deleteTeam returns false when no rows updated', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await deleteTeam(TENANT, 'ghost')).toBe(false);
  });

  it('listTeams passes status filter when provided', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await listTeams(TENANT, { status: 'archived' });
    expect(spy.calls[0].sql).toMatch(/status = \$/);
    expect(spy.calls[0].params).toContain('archived');
  });

  it('listTeams defaults paging when options empty', async () => {
    spy.setQueryStub((sql) => (sql.includes('COUNT') ? { rows: [{ count: '0' }] } : { rows: [] }));
    await listTeams(TENANT);
    const listCall = spy.calls.find((c) => c.sql.includes('LIMIT'))!;
    expect(listCall.params.at(-2)).toBe(25); // default pageSize
    expect(listCall.params.at(-1)).toBe(0);  // offset for page 1
  });

  it('createTeam handles optional fields as nulls', async () => {
    spy.setQueryStub(() => ({ rows: [{ team_id: 't-new', name: 'X' }] }));
    await createTeam(TENANT, { name: 'X', createdBy: 'u1' });
    expect(spy.calls[0].params[3]).toBeNull(); // code
    expect(spy.calls[0].params[4]).toBeNull(); // description
    expect(spy.calls[0].params[5]).toBeNull(); // department_id
  });

  it('createTeam re-throws non-23505 errors', async () => {
    spy.setQueryStub(() => { throw new Error('syntax'); });
    await expect(createTeam(TENANT, { name: 'X', createdBy: 'u1' })).rejects.toThrow(/syntax/);
  });

  it('updateTeam handles partial updates with COALESCE fallbacks', async () => {
    spy.setQueryStub(() => ({ rows: [{ team_id: 't1', name: 'N' }] }));
    await updateTeam(TENANT, 't1', {});
    // all params except first/last are null (COALESCE path)
    expect(spy.calls[0].params[1]).toBeNull();
    expect(spy.calls[0].params[2]).toBeNull();
    expect(spy.calls[0].params[3]).toBeNull();
    expect(spy.calls[0].params[4]).toBeNull();
  });

  it('addMember with empty role defaults to "member"', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{}] };
      return { rows: [{ member_id: 'm1', team_id: 't1', user_id: 'u1', role: 'member' }] };
    });
    const r = await addMember(TENANT, 't1', 'u1', '');
    expect(r.role).toBe('member');
  });
});
