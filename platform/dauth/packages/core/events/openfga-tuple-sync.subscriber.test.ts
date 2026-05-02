/**
 * K-8 — OpenFGA tuple-sync subscriber map() unit tests.
 *
 * Verifies that each event-payload mapper produces the right OpenFGA tuple
 * writes. The DAuth core depends on these mappings staying correct: an
 * incorrect map silently breaks the relation graph in production. The
 * tests pin the contract (object format, relation name, op direction) so
 * regressions surface immediately.
 *
 * No external services involved — these are pure functions on the MAPPERS
 * registry. The registry is exercised through the registerOpenFgaTupleSync
 * function's MAPPERS export pattern; we re-import the module and reach into
 * the symbol via the function source. Cleaner: every public mapping has
 * exactly one observable effect — a tuple shape — so we drive the test
 * via the public registerOpenFgaTupleSync subscribe-spy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setPlatformEvents } from '@dos/platform-core/events';

// Capture subscriber handlers via a stub PlatformEvents impl.
const subscribed = new Map<string, (event: { payload: Record<string, unknown> }) => Promise<void>>();
const writeTuples = vi.fn();

const stubEvents: any = {
  subscribe: (opts: { eventType: string; handler: (event: any) => Promise<void> }) => {
    subscribed.set(opts.eventType, opts.handler);
    return () => subscribed.delete(opts.eventType);
  },
  publish: vi.fn().mockResolvedValue('id'),
  getSubscriberCount: () => subscribed.size,
  getDeadLetterQueue: () => [],
  drainDeadLetterQueue: () => [],
  emitEvent: vi.fn().mockResolvedValue('id'),
};

vi.mock('../dauth.config', () => ({
  DAUTH_CONFIG: {
    openfga: { shadow: true, enforce: false },
  } as Record<string, unknown>,
}));

vi.mock('../adapters/rebac.factory', () => ({
  getRebacAdapters: () => ({
    primary: { name: 'openfga', writeTuples },
    shadow: undefined,
  }),
}));

import { registerOpenFgaTupleSync } from './openfga-tuple-sync.subscriber';

beforeEach(() => {
  subscribed.clear();
  writeTuples.mockClear();
  // Bypass the `_events` module-scoped slot — vitest can resolve the same
  // package via two distinct module instances (workspace + dist) which
  // means setPlatformEvents() writes one slot but subscribe() reads the
  // other. The function `getEvents()` checks `globalThis.__globalPlatformEvents`
  // FIRST, so this is the cross-instance handoff that always works.
  (globalThis as Record<string, unknown>).__globalPlatformEvents = stubEvents;
  setPlatformEvents(stubEvents);
  registerOpenFgaTupleSync();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__globalPlatformEvents;
});

// (afterEach + delete global declared in beforeEach pair above)

describe('OpenFGA tuple-sync mappers', () => {
  it('registers all 11+ event mappers', () => {
    // Phase F-3 added 5; Phase J-1 added 2 underscore variants + extra
    // hierarchy events; the canonical 6 (delegation/ownership/membership
    // create+delete) cover the original surface.
    expect(subscribed.size).toBeGreaterThanOrEqual(11);
    expect(subscribed.has('dauth.delegation.created')).toBe(true);
    expect(subscribed.has('dauth.ownership.assigned')).toBe(true);
    expect(subscribed.has('dauth.membership.added')).toBe(true);
    expect(subscribed.has('foundation.position.holder.assigned')).toBe(true);
    expect(subscribed.has('foundation.role.assigned')).toBe(true);
    expect(subscribed.has('foundation.role_assigned')).toBe(true); // legacy underscore
    expect(subscribed.has('foundation.org.manager.changed')).toBe(true);
  });

  it('membership.added → tenant#member tuple write', async () => {
    const handler = subscribed.get('dauth.membership.added')!;
    await handler({ payload: { userId: 'u-1', tenantId: 't-1' } });
    expect(writeTuples).toHaveBeenCalledTimes(1);
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'member', object: 'tenant:t-1', op: 'write' },
    ]);
  });

  it('membership.removed → tenant#member tuple delete', async () => {
    const handler = subscribed.get('dauth.membership.removed')!;
    await handler({ payload: { userId: 'u-1', tenantId: 't-1' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'member', object: 'tenant:t-1', op: 'delete' },
    ]);
  });

  it('delegation.created emits both endpoints of the delegation edge', async () => {
    const handler = subscribed.get('dauth.delegation.created')!;
    await handler({ payload: { fromUserId: 'a', toUserId: 'b', grantId: 'g-1' } });
    const args = writeTuples.mock.calls[0][0];
    expect(args).toHaveLength(2);
    expect(args).toContainEqual({ user: 'user:a', relation: 'from', object: 'delegation:g-1', op: 'write' });
    expect(args).toContainEqual({ user: 'user:b', relation: 'to', object: 'delegation:g-1', op: 'write' });
  });

  it('ownership.assigned writes a user→entity owner tuple', async () => {
    const handler = subscribed.get('dauth.ownership.assigned')!;
    await handler({ payload: { userId: 'u-1', entityType: 'risk', entityId: 'r-1' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'owner', object: 'risk:r-1', op: 'write' },
    ]);
  });

  it('foundation.position.holder.assigned writes user→position holder tuple', async () => {
    const handler = subscribed.get('foundation.position.holder.assigned')!;
    await handler({ payload: { userId: 'u-1', positionId: 'p-1' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'holder', object: 'position:p-1', op: 'write' },
    ]);
  });

  it('foundation.org.manager.changed swaps manager edges atomically', async () => {
    const handler = subscribed.get('foundation.org.manager.changed')!;
    await handler({ payload: { positionId: 'p-1', oldManagerPositionId: 'p-old', newManagerPositionId: 'p-new' } });
    const args = writeTuples.mock.calls[0][0];
    expect(args).toHaveLength(2);
    expect(args).toContainEqual({ user: 'position:p-old', relation: 'manager', object: 'position:p-1', op: 'delete' });
    expect(args).toContainEqual({ user: 'position:p-new', relation: 'manager', object: 'position:p-1', op: 'write' });
  });

  it('foundation.role.assigned uses tenant-scoped role object', async () => {
    const handler = subscribed.get('foundation.role.assigned')!;
    await handler({ payload: { userId: 'u-1', roleCode: 'risk_manager', tenantId: 't-1' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'assignee', object: 'role:t-1/risk_manager', op: 'write' },
    ]);
  });

  it('foundation.role.assigned without tenantId falls back to platform-scoped role', async () => {
    const handler = subscribed.get('foundation.role.assigned')!;
    await handler({ payload: { userId: 'u-1', roleCode: 'platform_admin' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'assignee', object: 'role:platform_admin', op: 'write' },
    ]);
  });

  it('foundation.role_assigned (legacy underscore) maps to the same tuples', async () => {
    const handler = subscribed.get('foundation.role_assigned')!;
    await handler({ payload: { userId: 'u-1', roleCode: 'risk_manager', tenantId: 't-1' } });
    expect(writeTuples).toHaveBeenCalledWith([
      { user: 'user:u-1', relation: 'assignee', object: 'role:t-1/risk_manager', op: 'write' },
    ]);
  });

  it('mappers ignore payloads with missing required fields (no tuples written)', async () => {
    const handler = subscribed.get('foundation.position.holder.assigned')!;
    await handler({ payload: {} });
    expect(writeTuples).not.toHaveBeenCalled();

    await handler({ payload: { userId: 'u-1' } });
    expect(writeTuples).not.toHaveBeenCalled();

    await handler({ payload: { positionId: 'p-1' } });
    expect(writeTuples).not.toHaveBeenCalled();
  });
});
