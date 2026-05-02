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

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: {
    deptCreated: vi.fn(), deptUpdated: vi.fn(), deptDeleted: vi.fn(),
    observeDb: vi.fn(),
  },
}));

import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.service';

const TENANT = 'tenant-a';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
});

describe('department.service', () => {
  it('getDepartments returns count + rows', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ count: 2 }] };
      return { rows: [{ dept_id: 'd1', tenant_id: TENANT, name_en: 'Finance' }, { dept_id: 'd2', tenant_id: TENANT, name_en: 'HR' }] };
    });
    const r = await getDepartments(TENANT);
    expect(r.count).toBe(2);
    expect(r.rows).toHaveLength(2);
    expect(spy.calls.every((c) => c.tenantId === TENANT)).toBe(true);
  });

  it('getDepartments falls back to rows.length when count is NaN', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ count: 'not-a-number' }] };
      return { rows: [{ dept_id: 'd1' }] };
    });
    const r = await getDepartments(TENANT);
    expect(r.count).toBe(1);
  });

  it('getDepartmentById returns null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await getDepartmentById(TENANT, 'ghost')).toBeNull();
  });

  it('getDepartmentById matches on dept_id or id::text', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1' }] }));
    await getDepartmentById(TENANT, 'd1');
    expect(spy.calls[0].sql).toMatch(/dept_id = \$1 OR id::text = \$1/);
  });

  it('createDepartment inserts with tenant scope', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd-new', tenant_id: TENANT, name_en: 'New' }] }));
    const r = await createDepartment(TENANT, { name_en: 'New', bu_id: 'bu-1' });
    expect(r.dept_id).toBe('d-new');
    expect(spy.calls[0].params[0]).toBe(TENANT);
  });

  it('updateDepartment returns null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await updateDepartment(TENANT, 'ghost', { name_en: 'X' })).toBeNull();
  });

  it('updateDepartment writes tenant in WHERE', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1', name_en: 'Updated' }] }));
    await updateDepartment(TENANT, 'd1', { name_en: 'Updated', status: 'inactive' });
    expect(spy.calls[0].sql).toMatch(/AND tenant_id = \$2/);
  });

  it('deleteDepartment is soft-delete', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1' }] }));
    const r = await deleteDepartment(TENANT, 'd1');
    expect(r.deleted).toBe(true);
    expect(spy.calls[0].sql).toMatch(/SET deleted_at = NOW\(\)/);
  });

  it('deleteDepartment returns deleted=false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    const r = await deleteDepartment(TENANT, 'ghost');
    expect(r.deleted).toBe(false);
  });

  it('getDepartments returns rows length as fallback when count is a number-like string', async () => {
    // ensures the fallback path (rawCount is a non-finite Number(Boolean) result)
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ count: NaN }] };
      return { rows: [{ dept_id: 'd1' }, { dept_id: 'd2' }] };
    });
    const r = await getDepartments(TENANT);
    expect(r.count).toBe(2);
  });

  it('getDepartmentById scopes tenant in WHERE', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1' }] }));
    await getDepartmentById(TENANT, 'd1');
    expect(spy.calls[0].sql).toMatch(/AND tenant_id = \$2/);
    expect(spy.calls[0].params).toEqual(['d1', TENANT]);
  });

  it('createDepartment persists all optional fields as provided (not nulls)', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1' }] }));
    await createDepartment(TENANT, {
      name_en: 'Engineering', name_ar: 'Hndsya', code: 'ENG',
      bu_id: 'bu-1', head_user_id: 'u-head', parent_id: 'd-root',
    });
    // params: [tenantId, name_en, name_ar, code, bu_id, head_user_id, parent_id]
    expect(spy.calls[0].params).toEqual([TENANT, 'Engineering', 'Hndsya', 'ENG', 'bu-1', 'u-head', 'd-root']);
  });

  it('updateDepartment writes all provided fields and NOW() for updated_at', async () => {
    spy.setQueryStub(() => ({ rows: [{ dept_id: 'd1' }] }));
    await updateDepartment(TENANT, 'd1', {
      name_en: 'E2', name_ar: 'H2', code: 'C2',
      bu_id: 'bu2', head_user_id: 'h2', parent_id: 'p2', status: 'inactive',
    });
    expect(spy.calls[0].sql).toMatch(/updated_at   = NOW/);
    // params: [deptId, tenantId, name_en, name_ar, code, bu_id, head_user_id, parent_id, status]
    expect(spy.calls[0].params).toEqual(['d1', TENANT, 'E2', 'H2', 'C2', 'bu2', 'h2', 'p2', 'inactive']);
  });
});
