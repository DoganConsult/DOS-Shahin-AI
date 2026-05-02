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
  userMetrics: { raciAssigned: vi.fn(), raciRevoked: vi.fn(), observeDb: vi.fn() },
}));

import { getRaciByUser, getRaciByTeam, assignRaci, revokeRaci } from './raci.service';

const TENANT = 'tenant-a';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
});

describe('raci.service', () => {
  it('getRaciByUser returns assignments + summary', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ id: 'r1', team_id: 't1', team_name: 'Team', user_id: 'u1', scope_type: 'tenant', scope_id: null, raci_role: 'responsible', assigned_by: 'u2', assigned_at: 'now' }] };
      return { rows: [{ scope_type: 'tenant', raci_role: 'responsible', count: 1 }] };
    });
    const r = await getRaciByUser(TENANT, 'u1');
    expect(r.assignments).toHaveLength(1);
    expect(r.summary).toHaveLength(1);
    expect(spy.calls.every((c) => c.tenantId === TENANT)).toBe(true);
  });

  it('getRaciByTeam scopes by tenant + team + revoked_at IS NULL', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await getRaciByTeam(TENANT, 't1');
    expect(spy.calls[0].sql).toMatch(/ra.tenant_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/ra.team_id = \$2/);
    expect(spy.calls[0].sql).toMatch(/revoked_at IS NULL/);
  });

  it('assignRaci rejects when team is not in the tenant', async () => {
    spy.setQueryStub(() => ({ rows: [] })); // team-check empty
    await expect(assignRaci(TENANT, {
      teamId: 't1', userId: 'u1', scopeType: 'tenant', raciRole: 'responsible', assignedBy: 'u2',
    })).rejects.toMatchObject({ code: 'TEAM_NOT_FOUND', status: 404 });
  });

  it('assignRaci inserts and returns the row + team_name', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ name: 'Alpha' }] };
      return { rows: [{ id: 'r1', team_id: 't1', user_id: 'u1', scope_type: 'tenant', scope_id: null, raci_role: 'responsible', assigned_by: 'u2', assigned_at: 'now' }] };
    });
    const r = await assignRaci(TENANT, {
      teamId: 't1', userId: 'u1', scopeType: 'tenant', raciRole: 'responsible', assignedBy: 'u2',
    });
    expect(r.id).toBe('r1');
    expect(r.team_name).toBe('Alpha');
  });

  it('revokeRaci returns true when row is updated', async () => {
    spy.setQueryStub(() => ({ rows: [{ id: 'r1' }], rowCount: 1 }));
    expect(await revokeRaci(TENANT, 'r1')).toBe(true);
    spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
    expect(await revokeRaci(TENANT, 'r2')).toBe(false);
  });

  it('assignRaci includes WHERE revoked_at IS NULL on the ON CONFLICT index', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ name: 'Alpha' }] };
      return { rows: [{ id: 'r1', team_id: 't1', user_id: 'u1', scope_type: 'tenant', scope_id: null, raci_role: 'responsible', assigned_by: 'u2', assigned_at: 'now' }] };
    });
    await assignRaci(TENANT, {
      teamId: 't1', userId: 'u1', scopeType: 'tenant', raciRole: 'responsible', assignedBy: 'u2',
    });
    expect(spy.calls[1].sql).toMatch(/WHERE revoked_at IS NULL/);
    expect(spy.calls[1].sql).toMatch(/DO UPDATE SET updated_at = NOW/);
  });

  it('revokeRaci sets revoked_at + updated_at to NOW and filters tenant', async () => {
    spy.setQueryStub(() => ({ rows: [{ id: 'r1' }] }));
    await revokeRaci(TENANT, 'r1');
    expect(spy.calls[0].sql).toMatch(/SET revoked_at = NOW.*updated_at = NOW/s);
    expect(spy.calls[0].sql).toMatch(/WHERE id = \$1 AND tenant_id = \$2 AND revoked_at IS NULL/);
    expect(spy.calls[0].params).toEqual(['r1', TENANT]);
  });

  it('getRaciByUser params order is (tenantId, userId)', async () => {
    spy.setQueryStub((sql) => (sql.includes('COUNT') ? { rows: [] } : { rows: [] }));
    await getRaciByUser(TENANT, 'u1');
    expect(spy.calls[0].params).toEqual([TENANT, 'u1']);
    expect(spy.calls[1].params).toEqual([TENANT, 'u1']);
  });

  it('getRaciByTeam sql joins teams and orders by raci_role', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await getRaciByTeam(TENANT, 't1');
    expect(spy.calls[0].sql).toMatch(/JOIN dos\.teams/);
    expect(spy.calls[0].sql).toMatch(/ORDER BY ra\.raci_role/);
  });
});
