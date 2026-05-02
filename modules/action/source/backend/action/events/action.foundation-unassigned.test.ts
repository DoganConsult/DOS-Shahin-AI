/**
 * F-005 — action subscriber for foundation.position.holder.unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn(),
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

import { getSubscriptionHandlers } from './action.subscribers';

const { safeQueryMock, createProcessTaskMock } = mocks;

describe('F-005 action ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
  });

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('clears owner_id on action_items and creates reassignment tasks', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [{ id: 'a_1' }, { id: 'a_2' }] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);

    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".action_items');
    expect(sql).toContain('owner_id = NULL');
    expect(params).toEqual(['u_42']);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'action_reassignment',
      entityType: 'action_item',
      entityId: 'a_1',
      triggerSource: 'foundation.position.holder.unassigned',
    });
  });

  it('no-op when payload has no userId', async () => {
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: {} } as any);
    expect(safeQueryMock).not.toHaveBeenCalled();
  });

  it('idempotent on second run', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });
});
