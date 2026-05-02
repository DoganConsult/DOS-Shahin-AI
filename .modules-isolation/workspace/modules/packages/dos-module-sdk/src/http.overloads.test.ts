import { describe, expect, it, vi } from 'vitest';
import { action, ok, paginated } from './http.ts';

describe('@dos/module-sdk/http envelope helpers', () => {
  it('ok(data) uses requestId=unknown', () => {
    const res = ok({ a: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ a: 1 });
    expect(res.meta.requestId).toBe('unknown');
    expect(typeof res.meta.timestamp).toBe('string');
  });

  it('ok(data, req) uses req.correlationId', () => {
    const res = ok({ a: 1 }, { correlationId: 'cid-1' });
    expect(res.meta.requestId).toBe('cid-1');
  });

  it('action(message) uses requestId=unknown', () => {
    const res = action('did-it');
    expect(res.success).toBe(true);
    expect(res.message).toBe('did-it');
    expect(res.meta.requestId).toBe('unknown');
  });

  it('paginated(data,total,page,pageSize,req) preserves pagination fields', () => {
    const res = paginated([{ id: 1 }], 51, 2, 25, { correlationId: 'cid-2' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.meta.requestId).toBe('cid-2');
    expect(res.meta.page).toBe(2);
    expect(res.meta.pageSize).toBe(25);
    expect(res.meta.total).toBe(51);
    expect(res.meta.totalPages).toBe(3);
  });

  it('paginated(data,total,query,req) derives page/pageSize from limit/offset', () => {
    const res = paginated([{ id: 1 }], 100, { limit: '20', offset: '40' }, { correlationId: 'cid-3' });
    expect(res.meta.requestId).toBe('cid-3');
    expect(res.meta.pageSize).toBe(20);
    expect(res.meta.page).toBe(3);
    expect(res.meta.totalPages).toBe(5);
  });
});

describe('module route-kit compatibility wrappers', () => {
  it('vendor route-kit ok(data, req) returns an envelope', async () => {
    const { ok: vendorOk, action: vendorAction, NotFoundError } = await import('../../../modules/vendor/source/backend/utils/route-kit');

    const okEnvelope = vendorOk({ a: 1 }, { correlationId: 'cid-v' } as any);
    expect(okEnvelope).toEqual(expect.objectContaining({ success: true, data: { a: 1 } }));
    expect(okEnvelope.meta.requestId).toBe('cid-v');

    const actionEnvelope = vendorAction('hello', { correlationId: 'cid-v2' } as any);
    expect(actionEnvelope).toEqual(expect.objectContaining({ success: true, message: 'hello' }));
    expect(actionEnvelope.meta.requestId).toBe('cid-v2');

    const err = new NotFoundError('vendor', 'v-1');
    expect(err.message).toContain('vendor not found');
  });

  it('vendor route-kit ok(res, data) writes json once', async () => {
    const { ok: vendorOk } = await import('../../../modules/vendor/source/backend/utils/route-kit');

    const json = vi.fn();
    const status = vi.fn();
    const send = vi.fn();

    vendorOk(
      { json, status, send, req: { correlationId: 'cid-v3' } } as any,
      { a: 1 },
    );

    expect(json).toHaveBeenCalledTimes(1);
    expect(json.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ success: true, data: { a: 1 } }));
  });
});
