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
  userMetrics: { roleAssigned: vi.fn(), roleRevoked: vi.fn(), observeDb: vi.fn() },
}));

import { listUserRoles, assignRole, revokeRole, listAvailableRoles } from './role.service';

const TENANT = 'tenant-a';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [] }));
});

describe('role.service', () => {
  it('listUserRoles joins dos.users to scope by tenant + user + active', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1', role_code: 'admin' }] }));
    const r = await listUserRoles(TENANT, 'u1');
    expect(r).toHaveLength(1);
    // Tenant scope comes from the users FK, not a direct tenant_id
    // column on user_role_assignments (see Phase 8 drift repair).
    expect(spy.calls[0].sql).toMatch(/JOIN dos\.users u ON u\.user_id = ra\.user_id/);
    expect(spy.calls[0].sql).toMatch(/u\.tenant_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/is_active = TRUE/);
    expect(spy.calls[0].params).toEqual([TENANT, 'u1']);
  });

  it('assignRole returns tenant_id on the payload even though the table has no tenant column', async () => {
    spy.setQueryStub((sql: string) => {
      // The pre-INSERT tenant guard (SELECT 1 FROM dos.users …) and
      // functional-role resolution must both be satisfied for the
      // INSERT branch to run.
      if (sql.startsWith('SELECT 1 FROM dos.users')) return { rows: [{ '?column?': 1 }] };
      if (sql.includes('FROM dos.functional_roles')) return { rows: [{ id: 'fr-uuid' }] };
      return { rows: [{ assignment_id: 'a1', role_code: 'admin' }] };
    });
    const r = await assignRole(TENANT, 'u1', 'admin', 'grantor');
    expect(r.tenant_id).toBe(TENANT);
  });

  it('assignRole guards target user by tenant before writing role rows', async () => {
    // User not in tenant → 404 before the INSERT runs.
    spy.setQueryStub(() => ({ rows: [] }));
    await expect(assignRole(TENANT, 'u-foreign', 'admin')).rejects.toThrow(/User not found in tenant/);
    // The very first SQL sent MUST be the tenant-scoped probe.
    expect(spy.calls[0].sql).toMatch(/SELECT 1 FROM dos\.users WHERE user_id = \$1 AND tenant_id = \$2/);
    // No INSERT hit the DB.
    expect(spy.calls.some(c => c.sql.startsWith('INSERT INTO dos.user_role_assignments'))).toBe(false);
  });

  it('assignRole rejects an unknown role code before INSERT', async () => {
    spy.setQueryStub((sql: string) => {
      if (sql.startsWith('SELECT 1 FROM dos.users')) return { rows: [{ '?column?': 1 }] };
      if (sql.includes('FROM dos.functional_roles')) return { rows: [] };
      return { rows: [] };
    });
    await expect(assignRole(TENANT, 'u1', 'bogus_role')).rejects.toThrow(/Unknown role code: bogus_role/);
    expect(spy.calls.some(c => c.sql.startsWith('INSERT INTO dos.user_role_assignments'))).toBe(false);
  });

  it('assignRole INSERT targets the real (user_id, functional_role_id) unique index', async () => {
    spy.setQueryStub((sql: string) => {
      if (sql.startsWith('SELECT 1 FROM dos.users')) return { rows: [{ '?column?': 1 }] };
      if (sql.includes('FROM dos.functional_roles')) return { rows: [{ id: 'fr-uuid' }] };
      return { rows: [{ assignment_id: 'a1' }] };
    });
    await assignRole(TENANT, 'u1', 'admin');
    const insertCall = spy.calls.find(c => c.sql.startsWith('INSERT INTO dos.user_role_assignments'));
    expect(insertCall).toBeDefined();
    expect(insertCall!.sql).toMatch(/ON CONFLICT \(user_id, functional_role_id\)/);
  });

  it('revokeRole joins dos.users to enforce tenant scope and returns true on match', async () => {
    spy.setQueryStub(() => ({ rows: [{ id: 'ra-uuid' }], rowCount: 1 }));
    expect(await revokeRole(TENANT, 'u1', 'admin')).toBe(true);
    expect(spy.calls[0].sql).toMatch(/FROM dos\.users u/);
    expect(spy.calls[0].sql).toMatch(/u\.tenant_id = \$1/);

    spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
    expect(await revokeRole(TENANT, 'u1', 'admin')).toBe(false);
  });

  it('listAvailableRoles groups by role_code scoped via users.tenant_id', async () => {
    spy.setQueryStub(() => ({ rows: [{ role_code: 'admin', count: 3 }] }));
    const r = await listAvailableRoles(TENANT);
    expect(r[0]).toEqual({ role_code: 'admin', count: 3 });
    expect(spy.calls[0].sql).toMatch(/JOIN dos\.users u ON u\.user_id = ra\.user_id/);
    expect(spy.calls[0].params).toEqual([TENANT]);
  });
});
