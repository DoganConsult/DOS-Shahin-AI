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

import * as svc from './org-hierarchy.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('org-hierarchy.service', () => {
  it('getOrgTree uses recursive CTE with depth limit', async () => {
    spy.setQueryStub(() => ({ rows: [{ node_id: 'o1', depth: 0 }] }));
    const r = await svc.getOrgTree(TENANT);
    expect(r).toHaveLength(1);
    expect(spy.calls[0].sql).toMatch(/WITH RECURSIVE/);
    expect(spy.calls[0].sql).toMatch(/t\.depth < 10/);
    expect(spy.calls[0].params).toEqual([TENANT]);
  });

  it('getSubtree starts at the given node', async () => {
    spy.setQueryStub(() => ({ rows: [{ node_id: 'o1', depth: 0 }] }));
    await svc.getSubtree(TENANT, 'o1');
    expect(spy.calls[0].params).toEqual(['o1', TENANT]);
    expect(spy.calls[0].sql).toMatch(/WHERE organization_id = \$1/);
  });
});
