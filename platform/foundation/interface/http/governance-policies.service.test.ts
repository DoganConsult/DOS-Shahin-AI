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

vi.mock('../../ports/database.port', () => ({ withTenantClient: spy.withTenantClient, tenantSchema: (t: string) => `tenant_${t}` }));
vi.mock('../../infrastructure/observability/metrics', () => ({ userMetrics: { observeDb: vi.fn() } }));

import * as svc from './governance-policies.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('governance-policies.service', () => {
  it('list applies category filter', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listPolicies(TENANT, { category: 'security' });
    expect(spy.calls[0].sql).toMatch(/category = \$/);
  });

  it('get returns null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getPolicy(TENANT, 'ghost')).toBeNull();
  });

  it('create defaults status to draft', async () => {
    spy.setQueryStub(() => ({ rows: [{ policy_id: 'p1' }] }));
    await svc.createPolicy(TENANT, { title_en: 'P' }, 'u1');
    expect(spy.calls[0].sql).toMatch(/COALESCE\(\$11, 'draft'\)/);
  });

  it('update returns null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.updatePolicy(TENANT, 'ghost', {})).toBeNull();
  });

  it('delete false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deletePolicy(TENANT, 'ghost')).toBe(false);
  });

  it('getDashboard runs parallel counts', async () => {
    spy.setQueryStub((sql) => {
      if (sql.includes('GROUP BY status')) return { rows: [{ status: 'active', count: '5' }] };
      return { rows: [{ count: '10' }] };
    });
    const d = await svc.getDashboard(TENANT);
    expect(d.policy_counts).toEqual([{ status: 'active', count: '5' }]);
    expect(d.total_organizations).toBe(10);
    expect(d.total_business_units).toBe(10);
    expect(d.total_committees).toBe(10);
  });
});
