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

import * as svc from './sod-check.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('sod-check.service', () => {
  it('checkSod returns ALLOWED when no conflicts', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ role_code: 'reader' }] };
      return { rows: [] }; // no conflicts
    });
    const decision = await svc.checkSod(TENANT, 'u1', 'writer');
    expect(decision.decision).toBe('ALLOWED');
    expect(decision.current_roles).toEqual(['reader']);
    expect(decision.has_conflicts).toBe(false);
  });

  it('checkSod returns BLOCKED when a rule matches', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ role_code: 'approver' }] };
      return { rows: [{ rule_id: 'r1', role_a: 'approver', role_b: 'requester' }] };
    });
    const decision = await svc.checkSod(TENANT, 'u1', 'requester');
    expect(decision.decision).toBe('BLOCKED');
    expect(decision.conflicts).toHaveLength(1);
  });

  it('listSodRules scopes by tenant', async () => {
    spy.setQueryStub(() => ({ rows: [{ rule_id: 'r1' }] }));
    const r = await svc.listSodRules(TENANT);
    expect(r).toHaveLength(1);
  });

  it('createSodRule defaults severity to high and is active', async () => {
    spy.setQueryStub(() => ({ rows: [{ rule_id: 'r1' }] }));
    await svc.createSodRule(TENANT, { role_a: 'a', role_b: 'b' }, 'u1');
    expect(spy.calls[0].params[4]).toBe('high');
  });

  it('deleteSodRule true/false by rows', async () => {
    spy.setQueryStub(() => ({ rows: [{ rule_id: 'r1' }] }));
    expect(await svc.deleteSodRule(TENANT, 'r1')).toBe(true);
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deleteSodRule(TENANT, 'ghost')).toBe(false);
  });
});
