/**
 * Phase 6 — training subscriber for foundation.dept_created (F-051).
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

describe('Phase 6 training ← foundation.dept_created', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.dept_created')).toBe(true);
  });

  it('creates one training_baseline_enroll task per event', async () => {
    const h = getSubscriptionHandlers().get('foundation.dept_created')!;
    await h({ tenantId: 't_1', payload: { entityId: 'dept_1' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'training_baseline_enroll',
      entityType: 'department',
      entityId: 'dept_1',
      triggerSource: 'foundation.dept_created',
    });
  });

  it('no-op when payload has no entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.dept_created')!;
    await h({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to event.entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.dept_created')!;
    await h({ tenantId: 't_1', entityId: 'dept_2', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
  });
});
