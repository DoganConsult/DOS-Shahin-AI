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
  isRedisHealthy: vi.fn(async () => true),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: {
    userCreated: vi.fn(), userUpdated: vi.fn(), userDeactivated: vi.fn(),
    observeDb: vi.fn(),
  },
}));

import { listUsers, getUserById, createUser, updateUser, deactivateUser } from './user.service';
import { UserServiceError } from './contracts/user-errors';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
});

describe('user.service', () => {
  describe('listUsers', () => {
    it('scopes every query to the tenant', async () => {
      spy.setQueryStub((sql) => {
        if (/COUNT/.test(sql)) return { rows: [{ count: '2' }] };
        return { rows: [{ user_id: 'u1' }, { user_id: 'u2' }] };
      });
      const result = await listUsers(TENANT_A, { page: 1, pageSize: 10 });
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(spy.calls.every((c) => c.tenantId === TENANT_A)).toBe(true);
    });

    it('applies status + role filters as additional WHERE clauses', async () => {
      spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
      await listUsers(TENANT_A, { status: 'active', role: 'admin' });
      const listCall = spy.calls.find((c) => c.sql.includes('LIMIT'));
      expect(listCall?.sql).toMatch(/status = \$/);
      expect(listCall?.sql).toMatch(/role = \$/);
      expect(listCall?.params.slice(0, 3)).toEqual([TENANT_A, 'active', 'admin']);
    });

    it('never leaks tenant-B data when asked for tenant-A', async () => {
      // Integration-level contract: listUsers must never return rows absent
      // a tenant filter. We assert that the SQL contains `tenant_id = $1`.
      spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
      await listUsers(TENANT_A);
      expect(spy.calls[0].sql).toMatch(/tenant_id = \$1/);
      expect(spy.calls[0].params[0]).toBe(TENANT_A);
    });
  });

  describe('getUserById', () => {
    it('returns null when no row', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      const result = await getUserById(TENANT_A, 'user-x');
      expect(result).toBeNull();
    });

    it('returns the row when present', async () => {
      spy.setQueryStub(() => ({ rows: [{ user_id: 'user-x', email: 'x@y' }] }));
      const result = await getUserById(TENANT_A, 'user-x');
      expect(result?.user_id).toBe('user-x');
    });

    it('enforces tenant_id match in the WHERE clause', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      await getUserById(TENANT_B, 'shared-id');
      expect(spy.calls[0].sql).toMatch(/tenant_id = \$2/);
      expect(spy.calls[0].params).toEqual(['shared-id', TENANT_B]);
    });
  });

  describe('createUser', () => {
    it('inserts with the given tenant_id and returns the row', async () => {
      spy.setQueryStub(() => ({
        rows: [{ user_id: 'new-u', email: 'a@b', tenant_id: TENANT_A }],
      }));
      const user = await createUser(TENANT_A, { email: 'a@b', name: 'Alice' });
      expect(user.user_id).toBe('new-u');
      expect(spy.calls[0].params).toContain(TENANT_A);
    });

    it('translates Postgres unique-violation (23505) into USER_EMAIL_DUPLICATE', async () => {
      spy.setQueryStub(() => {
        const err = new Error('duplicate key') as Error & { code: string };
        err.code = '23505';
        throw err;
      });
      await expect(createUser(TENANT_A, { email: 'dup@x', name: 'Dup' }))
        .rejects.toMatchObject({
          name: 'UserServiceError',
          code: 'USER_EMAIL_DUPLICATE',
          status: 409,
        });
    });

    it('re-throws non-23505 errors unchanged', async () => {
      spy.setQueryStub(() => { throw new Error('boom'); });
      await expect(createUser(TENANT_A, { email: 'x@y', name: 'X' }))
        .rejects.toThrow(/boom/);
    });
  });

  describe('updateUser', () => {
    it('returns null when target does not exist in this tenant', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      const r = await updateUser(TENANT_A, 'missing', { name: 'New' });
      expect(r).toBeNull();
    });

    it('passes COALESCE params in the right positions', async () => {
      spy.setQueryStub((sql) =>
        sql.includes('SELECT') ? { rows: [{ user_id: 'u1' }] } : { rows: [{ user_id: 'u1', name: 'New' }] },
      );
      await updateUser(TENANT_A, 'u1', { name: 'New', status: 'active' });
      const updateCall = spy.calls.find((c) => /UPDATE/.test(c.sql));
      expect(updateCall?.params[0]).toBe('u1');
      expect(updateCall?.params[1]).toBe('New');       // name
      expect(updateCall?.params[5]).toBe('active');    // status
      expect(updateCall?.params.at(-1)).toBe(TENANT_A);
    });
  });

  describe('deactivateUser', () => {
    it('sets status=inactive and returns the row', async () => {
      let step = 0;
      spy.setQueryStub(() => {
        step += 1;
        if (step === 1) return { rows: [{ user_id: 'u1' }] };
        return { rows: [{ user_id: 'u1', status: 'inactive' }] };
      });
      const r = await deactivateUser(TENANT_A, 'u1');
      expect(r?.status).toBe('inactive');
    });

    it('returns null when user is not found', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      const r = await deactivateUser(TENANT_A, 'ghost');
      expect(r).toBeNull();
    });
  });

  it('UserServiceError carries code+status+correlation', () => {
    const e = new UserServiceError('USER_NOT_FOUND');
    expect(e.code).toBe('USER_NOT_FOUND');
    expect(e.status).toBe(404);
    expect(e.correlationId).toMatch(/[0-9a-f-]{36}/);
  });

  it('createUser falls back to email local-part when no display name given', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1', email: 'alice@x.com', tenant_id: TENANT_A }] }));
    await createUser(TENANT_A, { email: 'alice@x.com' } as any);
    // display_name param should be 'alice' (local part of email)
    expect(spy.calls[0].params[2]).toBe('alice');
  });

  it('createUser uses first+last full name when both present', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1', email: 'a@b', tenant_id: TENANT_A }] }));
    await createUser(TENANT_A, { email: 'a@b', first_name: 'First', last_name: 'Last' } as any);
    expect(spy.calls[0].params[3]).toBe('First Last');
  });

  it('deactivateUser re-throws on DB error', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ user_id: 'u1' }] };
      throw new Error('boom');
    });
    await expect(deactivateUser(TENANT_A, 'u1')).rejects.toThrow(/boom/);
  });

  it('updateUser passes all fields through COALESCE', async () => {
    spy.setQueryStub((sql) =>
      sql.includes('SELECT') ? { rows: [{ user_id: 'u1' }] } : { rows: [{ user_id: 'u1' }] },
    );
    await updateUser(TENANT_A, 'u1', {
      name: 'N', full_name: 'F L', language: 'ar',
      department_id: 'd1', status: 'active', role: 'admin', job_title: 'CTO',
    });
    const updateCall = spy.calls.find((c) => /UPDATE/.test(c.sql))!;
    const [, name, full, lang, dept, status, role, title] = updateCall.params as any[];
    expect([name, full, lang, dept, status, role, title]).toEqual(['N', 'F L', 'ar', 'd1', 'active', 'admin', 'CTO']);
  });

  it('listUsers omits filters when none provided (only tenant_id)', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await listUsers(TENANT_A);
    expect(spy.calls[0].sql).not.toMatch(/status = \$/);
    expect(spy.calls[0].sql).not.toMatch(/role = \$/);
  });
});
