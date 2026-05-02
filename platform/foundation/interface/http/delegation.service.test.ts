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

import * as svc from './delegation.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('delegation.service', () => {
  it('list as admin omits actor filter', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listDelegations(TENANT, { actorId: 'u1', isAdmin: true });
    expect(spy.calls[0].sql).not.toMatch(/d.delegator_id = \$2/);
  });

  it('list direction=from filters delegator_id', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listDelegations(TENANT, { actorId: 'u1', isAdmin: false, direction: 'from' });
    expect(spy.calls[0].sql).toMatch(/d.delegator_id = \$/);
  });

  it('list direction=to filters delegate_id', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listDelegations(TENANT, { actorId: 'u1', isAdmin: false, direction: 'to' });
    expect(spy.calls[0].sql).toMatch(/d.delegate_id  = \$/);
  });

  it('list direction=both filters either', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listDelegations(TENANT, { actorId: 'u1', isAdmin: false });
    expect(spy.calls[0].sql).toMatch(/\(d.delegator_id = \$2 OR d.delegate_id = \$2\)/);
  });

  it('getDelegation null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getDelegation(TENANT, 'ghost')).toBeNull();
  });

  it('createDelegation defaults delegator to actor when omitted', async () => {
    spy.setQueryStub(() => ({ rows: [{ delegation_id: 'd1' }] }));
    await svc.createDelegation(TENANT, { delegate_id: 'u2' }, 'actor');
    // delegator_id param at index 2 should be actor
    expect(spy.calls[0].params[2]).toBe('actor');
  });

  it('createDelegation with explicit delegator', async () => {
    spy.setQueryStub(() => ({ rows: [{ delegation_id: 'd1' }] }));
    await svc.createDelegation(TENANT, { delegator_id: 'someone', delegate_id: 'u2' }, 'actor');
    expect(spy.calls[0].params[2]).toBe('someone');
  });

  it('revokeDelegation true/false', async () => {
    spy.setQueryStub(() => ({ rows: [{ delegation_id: 'd1' }] }));
    expect(await svc.revokeDelegation(TENANT, 'd1')).toBe(true);
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.revokeDelegation(TENANT, 'ghost')).toBe(false);
  });
});
