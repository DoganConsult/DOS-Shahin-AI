import { describe, expect, it, vi, beforeEach } from 'vitest';

const { spy } = vi.hoisted(() => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  let stub: (sql: string, params?: unknown[]) => any = () => ({ rows: [], rowCount: 0 });
  let nextFail = false;
  const withTenantClient = async (tenantId: string, fn: (c: any) => any) => {
    const client = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ tenantId, sql, params: params ?? [] });
        const r = await stub(sql, params);
        return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0), command: '', oid: 0, fields: [] };
      },
    };
    if (nextFail) { nextFail = false; throw new Error('boom'); }
    return fn(client);
  };
  return {
    spy: {
      calls,
      setQueryStub: (next: typeof stub) => { stub = next; },
      forceNextFailure: () => { nextFail = true; },
      withTenantClient,
    },
  };
});

vi.mock('@dos/db', () => ({
  withTenantClient: spy.withTenantClient,
  query: vi.fn(),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));
vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError, debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: { roleAssigned: vi.fn(), roleRevoked: vi.fn(), observeDb: vi.fn() },
}));

import { listRoleAssignments, assignRole, revokeRoleAssignment } from './role-assignment.service';

const TENANT = 'tenant-a';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
  mockLoggerError.mockClear();
});

describe('role-assignment.service', () => {
  it('listRoleAssignments scopes by tenant + user + active', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1', role_code: 'admin' }] }));
    const r = await listRoleAssignments(TENANT, 'u1');
    expect(r).toHaveLength(1);
    expect(spy.calls[0].params).toEqual([TENANT, 'u1']);
  });

  it('listRoleAssignments returns [] and logs on failure', async () => {
    spy.forceNextFailure();
    const r = await listRoleAssignments(TENANT, 'u1');
    expect(r).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('assignRole writes tenant and grantor', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1', tenant_id: TENANT, role_code: 'admin', user_id: 'u1', granted_by: 'grantor', is_active: true }] }));
    const r = await assignRole(TENANT, 'u1', 'admin', 'grantor');
    expect(r.tenant_id).toBe(TENANT);
    expect(spy.calls[0].params).toContain('grantor');
    expect(spy.calls[0].params).toContain(TENANT);
  });

  it('assignRole re-throws and logs on DB failure', async () => {
    spy.forceNextFailure();
    await expect(assignRole(TENANT, 'u1', 'admin', 'g')).rejects.toThrow();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('revokeRoleAssignment returns true only when row updated', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1', role_code: 'admin' }], rowCount: 1 }));
    expect(await revokeRoleAssignment(TENANT, 'u1', 'a1')).toBe(true);
    spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
    expect(await revokeRoleAssignment(TENANT, 'u1', 'a2')).toBe(false);
  });

  it('revokeRoleAssignment logs and re-throws on DB failure', async () => {
    spy.forceNextFailure();
    await expect(revokeRoleAssignment(TENANT, 'u1', 'a1')).rejects.toThrow();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('listRoleAssignments SQL uses active filter + tenant scope', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await listRoleAssignments(TENANT, 'u1');
    expect(spy.calls[0].sql).toMatch(/tenant_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/user_id = \$2/);
    expect(spy.calls[0].sql).toMatch(/is_active = TRUE/);
    expect(spy.calls[0].sql).toMatch(/ORDER BY granted_at DESC/);
  });

  it('assignRole includes UPSERT on (tenant_id, user_id, role_code)', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1' }] }));
    await assignRole(TENANT, 'u1', 'admin', 'g');
    expect(spy.calls[0].sql).toMatch(/ON CONFLICT \(tenant_id, user_id, role_code\) WHERE is_active = TRUE/);
    expect(spy.calls[0].sql).toMatch(/DO UPDATE/);
  });

  it('revokeRoleAssignment sets is_active=false + revoked_at', async () => {
    spy.setQueryStub(() => ({ rows: [{ assignment_id: 'a1', role_code: 'admin' }], rowCount: 1 }));
    await revokeRoleAssignment(TENANT, 'u1', 'a1');
    expect(spy.calls[0].sql).toMatch(/SET is_active = FALSE, revoked_at = NOW/);
    expect(spy.calls[0].sql).toMatch(/assignment_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/tenant_id = \$2/);
    expect(spy.calls[0].sql).toMatch(/user_id = \$3/);
    expect(spy.calls[0].sql).toMatch(/is_active = TRUE/);
  });
});
