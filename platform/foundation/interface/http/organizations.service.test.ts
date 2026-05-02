import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  return { spy: { calls, setQueryStub: (next: typeof stub) => { stub = next; }, withTenantClient } };
});

vi.mock('../../ports/database.port', () => ({
  withTenantClient: spy.withTenantClient,
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../infrastructure/observability/metrics', () => ({
  userMetrics: { observeDb: vi.fn() },
}));

import * as svc from './organizations.service';

const TENANT = 't-a';

beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('organizations.service', () => {
  it('list scopes by tenant + deleted_at', async () => {
    spy.setQueryStub((sql) => (sql.includes('COUNT') ? { rows: [{ count: '0' }] } : { rows: [] }));
    await svc.listOrganizations(TENANT);
    expect(spy.calls[0].sql).toMatch(/tenant_id = \$1/);
    expect(spy.calls[0].sql).toMatch(/deleted_at IS NULL/);
  });

  it('list applies search filter', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listOrganizations(TENANT, { search: 'foo' });
    expect(spy.calls[0].params.some((p) => p === '%foo%')).toBe(true);
  });

  it('getOrganization returns null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getOrganization(TENANT, 'ghost')).toBeNull();
  });

  it('createOrganization inserts with tenant + actor', async () => {
    spy.setQueryStub(() => ({ rows: [{ organization_id: 'o1', tenant_id: TENANT }] }));
    const r = await svc.createOrganization(TENANT, { name_en: 'X' }, 'u1');
    expect(r.organization_id).toBe('o1');
    expect(spy.calls[0].params).toContain(TENANT);
    expect(spy.calls[0].params).toContain('u1');
  });

  it('updateOrganization null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.updateOrganization(TENANT, 'x', { name_en: 'n' })).toBeNull();
  });

  it('deleteOrganization is soft-delete', async () => {
    spy.setQueryStub(() => ({ rows: [{ organization_id: 'o1' }] }));
    expect(await svc.deleteOrganization(TENANT, 'o1')).toBe(true);
    expect(spy.calls[0].sql).toMatch(/SET deleted_at = NOW/);
  });

  it('deleteOrganization false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deleteOrganization(TENANT, 'ghost')).toBe(false);
  });
});
