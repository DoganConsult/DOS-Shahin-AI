/**
 * Phase 2 — issues subscriber for foundation.org.manager.changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/lifecycle.port', () => ({
  createProcessTask: mocks.createProcessTaskMock,
}));
vi.mock('../ports/events.port', () => ({
  eventBus: { subscribe: vi.fn() },
}));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/platform-core/shell/navigation/navigation-integration', () => ({
  registerNavigationIntegration: vi.fn(),
}));

import { getSubscriptionHandlers } from './issues.subscribers';

const { createProcessTaskMock } = mocks;

describe('Phase 2 issues ← foundation.org.manager.changed', () => {
  beforeEach(() => {
    createProcessTaskMock.mockReset();
  });

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.org.manager.changed')).toBe(true);
  });

  it('creates one recompute task per event', async () => {
    const handler = getSubscriptionHandlers().get('foundation.org.manager.changed')!;
    await handler({ tenantId: 't_1', payload: { positionId: 'p_1', oldManagerPositionId: 'm_old', newManagerPositionId: 'm_new' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'issues_escalation_recompute',
      entityType: 'position',
      entityId: 'p_1',
      triggerSource: 'foundation.org.manager.changed',
    });
  });

  it('no-op when payload has no positionId', async () => {
    const handler = getSubscriptionHandlers().get('foundation.org.manager.changed')!;
    await handler({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('uses event.entityId as fallback positionId', async () => {
    const handler = getSubscriptionHandlers().get('foundation.org.manager.changed')!;
    await handler({ tenantId: 't_1', entityId: 'p_2', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({ entityId: 'p_2' });
  });
});
