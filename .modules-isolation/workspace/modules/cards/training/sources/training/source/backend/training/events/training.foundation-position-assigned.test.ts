/**
 * Phase 7 — training subscriber for foundation.position.holder.assigned (F-060).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
}));
vi.mock('../ports/lifecycle.port', () => ({ createProcessTask: mocks.createProcessTaskMock }));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../ports/events.port', () => ({ eventBus: { subscribe: vi.fn() } }));
vi.mock('@dos/platform-core/resilience', () => ({
  swallow: (_ec: unknown, p: unknown) => p,
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { getSubscriptionHandlers } from './training.subscribers';

const { createProcessTaskMock } = mocks;

describe('Phase 7 training ← foundation.position.holder.assigned', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.assigned')).toBe(true);
  });

  it('creates one training_position_enroll task per event', async () => {
    const h = getSubscriptionHandlers().get('foundation.position.holder.assigned')!;
    await h({ tenantId: 't_1', payload: { userId: 'u_1', positionId: 'pos_1' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'training_position_enroll',
      entityType: 'user',
      entityId: 'u_1',
      triggerSource: 'foundation.position.holder.assigned',
    });
  });

  it('no-op when payload missing userId', async () => {
    const h = getSubscriptionHandlers().get('foundation.position.holder.assigned')!;
    await h({ tenantId: 't_1', payload: { positionId: 'pos_1' } } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('no-op when payload missing positionId', async () => {
    const h = getSubscriptionHandlers().get('foundation.position.holder.assigned')!;
    await h({ tenantId: 't_1', payload: { userId: 'u_1' } } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });
});
