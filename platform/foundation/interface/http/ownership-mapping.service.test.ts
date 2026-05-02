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

import * as svc from './ownership-mapping.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('ownership-mapping.service', () => {
  it('list with entity_type and owner_id filters', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listOwnership(TENANT, { entity_type: 'risk', owner_id: 'u1' });
    expect(spy.calls[0].sql).toMatch(/entity_type = \$/);
    expect(spy.calls[0].sql).toMatch(/owner_user_id = \$/);
  });

  it('list with no filters just tenant + deleted_at', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listOwnership(TENANT);
    expect(spy.calls[0].sql).not.toMatch(/entity_type = \$/);
  });

  it('getOwnershipForEntity joins users for email/display', async () => {
    spy.setQueryStub(() => ({ rows: [{ mapping_id: 'm1' }] }));
    await svc.getOwnershipForEntity(TENANT, 'risk', 'r1');
    expect(spy.calls[0].sql).toMatch(/LEFT JOIN dos\.users/);
    expect(spy.calls[0].params).toEqual(['risk', 'r1', TENANT]);
  });

  it('createOwnership defaults type to primary', async () => {
    spy.setQueryStub(() => ({ rows: [{ mapping_id: 'm1' }] }));
    await svc.createOwnership(TENANT, { entity_type: 'risk', entity_id: 'r1', owner_id: 'u1' }, 'actor');
    // ownership_type param
    expect(spy.calls[0].params[5]).toBe('primary');
    expect(spy.calls[0].params).toContain('actor');
  });

  it('revokeOwnership true/false based on rows', async () => {
    spy.setQueryStub(() => ({ rows: [{ mapping_id: 'm1' }] }));
    expect(await svc.revokeOwnership(TENANT, 'm1')).toBe(true);
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.revokeOwnership(TENANT, 'ghost')).toBe(false);
  });
});
