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

import * as svc from './access-review.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('access-review.service', () => {
  it('list with status filter', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listReviews(TENANT, { status: 'open' });
    expect(spy.calls[0].sql).toMatch(/status = \$/);
  });

  it('get null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getReview(TENANT, 'ghost')).toBeNull();
  });

  it('listItems joins users', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listItems(TENANT, 'r1');
    expect(spy.calls[0].sql).toMatch(/LEFT JOIN dos\.users/);
  });

  it('createReview defaults review_type to periodic', async () => {
    spy.setQueryStub(() => ({ rows: [{ review_id: 'r1' }] }));
    await svc.createReview(TENANT, { title: 'Q1' }, 'u1');
    // review_type is param index 7 (1-based)
    expect(spy.calls[0].params[7]).toBe('periodic');
  });

  it('decideItem null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.decideItem(TENANT, 'r1', 'ghost', 'approve', null, 'u1')).toBeNull();
  });

  it('decideItem writes decision + reviewer', async () => {
    spy.setQueryStub(() => ({ rows: [{ item_id: 'i1' }] }));
    await svc.decideItem(TENANT, 'r1', 'i1', 'revoke', 'note', 'u1');
    expect(spy.calls[0].params).toContain('revoke');
    expect(spy.calls[0].params).toContain('u1');
    expect(spy.calls[0].params).toContain('note');
  });

  it('closeReview only matches open status', async () => {
    spy.setQueryStub(() => ({ rows: [{ review_id: 'r1', status: 'closed' }] }));
    await svc.closeReview(TENANT, 'r1');
    expect(spy.calls[0].sql).toMatch(/AND status = 'open'/);
  });

  it('closeReview null when already closed or missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.closeReview(TENANT, 'ghost')).toBeNull();
  });
});
