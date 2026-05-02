// HG6 — Outbox delivery: verify bindFoundationPublisher routes domain
// events through the injected EventBus, increments the eventsPublished
// counter, and propagates meta (tenantId, userId, idempotencyKey) verbatim.
//
// This is a pure in-process integration test against a stub EventBus so it
// can run in CI without Postgres or Redis. The real DB-level outbox_events
// delivery (event-backbone → Postgres outbox → Redis stream) is covered by
// the platform-level event-backbone contract test — foundation's obligation
// stops at "publish is called with the right shape".

import { describe, it, expect, vi } from 'vitest';
import { bindFoundationPublisher, publishFoundationEvent, FOUNDATION_METRICS } from '../../index';

describe('Foundation outbox binder (HG6)', () => {
  it('routes publish() calls through the bound EventBus with meta', async () => {
    const bus = { publish: vi.fn().mockResolvedValue('evt-1') };
    bindFoundationPublisher(bus);

    const before = FOUNDATION_METRICS.eventsPublished.snapshot();
    await publishFoundationEvent('foundation.org_created', {
      eventType: 'foundation.org_created',
      tenantId: 'tenant-xyz',
      userId: 'user-1',
      idempotencyKey: 'key-abc',
      entityId: 'org-1',
      payload: { name: 'ACME' },
    } as any);

    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [eventType, payload, meta] = bus.publish.mock.calls[0];
    expect(eventType).toBe('foundation.org_created');
    expect(meta).toEqual({
      tenantId: 'tenant-xyz',
      userId: 'user-1',
      idempotencyKey: 'key-abc',
    });
    expect((payload as any).moduleCode).toBe('foundation');

    const after = FOUNDATION_METRICS.eventsPublished.snapshot();
    expect((after['foundation.org_created'] ?? 0) - (before['foundation.org_created'] ?? 0)).toBe(1);
  });

  it('records failure label on publish error without swallowing the throw', async () => {
    const bus = {
      publish: vi.fn().mockRejectedValue(new Error('redis down')),
    };
    bindFoundationPublisher(bus);

    const before = FOUNDATION_METRICS.eventsPublished.snapshot();
    await expect(
      publishFoundationEvent('foundation.org_updated', {
        eventType: 'foundation.org_updated',
        tenantId: 'tenant-xyz',
        payload: {},
      } as any),
    ).rejects.toThrow('redis down');
    const after = FOUNDATION_METRICS.eventsPublished.snapshot();
    expect((after['foundation.org_updated__failed'] ?? 0) - (before['foundation.org_updated__failed'] ?? 0)).toBe(1);
  });
});
