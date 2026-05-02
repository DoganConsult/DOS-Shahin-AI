/**
 * Phase 4 — governance subscriber for foundation.role.assigned / .unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/lifecycle.port', () => ({
  createProcessTask: mocks.createProcessTaskMock,
}));
vi.mock('../../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../ports/events.port', () => ({
  eventBus: { subscribe: vi.fn() },
}));
vi.mock('@dos/platform-core/shell/navigation/navigation-integration', () => ({
  registerNavigationIntegration: vi.fn(),
}));

import { getSubscriptionHandlers } from './governance.subscribers';

const { createProcessTaskMock } = mocks;

describe('Phase 4 governance ← foundation.role.assigned/unassigned', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers both handlers', () => {
    const h = getSubscriptionHandlers();
    expect(h.has('foundation.role.assigned')).toBe(true);
    expect(h.has('foundation.role.unassigned')).toBe(true);
  });

  it('creates one governance review task on assigned', async () => {
    const h = getSubscriptionHandlers().get('foundation.role.assigned')!;
    await h({ tenantId: 't_1', payload: { roleCode: 'AP_CLERK', userId: 'u_1' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'governance_role_review',
      entityType: 'role',
      entityId: 'AP_CLERK',
      triggerSource: 'foundation.role.assigned',
    });
  });

  it('creates one governance review task on unassigned', async () => {
    const h = getSubscriptionHandlers().get('foundation.role.unassigned')!;
    await h({ tenantId: 't_1', payload: { roleCode: 'AP_CLERK', userId: 'u_1' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      triggerSource: 'foundation.role.unassigned',
    });
  });

  it('no-op when payload has no roleCode and no entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.role.assigned')!;
    await h({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to event.entityId when payload omits roleCode', async () => {
    const h = getSubscriptionHandlers().get('foundation.role.unassigned')!;
    await h({ tenantId: 't_1', entityId: 'CONTROLLER', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({ entityId: 'CONTROLLER' });
  });
});
