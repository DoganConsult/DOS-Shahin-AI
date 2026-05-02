/**
 * Phase 3 — knowledge subscriber for foundation.scope_changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/lifecycle.port', () => ({
  createProcessTask: mocks.createProcessTaskMock,
}));
vi.mock('../ports/events.port', () => ({
  onEvent: vi.fn(),
}));

import { getSubscriptionHandlers } from './knowledge.subscribers';

const { createProcessTaskMock } = mocks;

describe('Phase 3 knowledge ← foundation.scope_changed', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.scope_changed')).toBe(true);
  });

  it('creates one knowledge access recompute task per event', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', payload: { entityId: 'org_1', entityType: 'department' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'knowledge_access_recompute',
      entityType: 'department',
      entityId: 'org_1',
      triggerSource: 'foundation.scope_changed',
    });
  });

  it('no-op when payload has no entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to event.entityId when payload omits it', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', entityId: 'org_2', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
  });
});
