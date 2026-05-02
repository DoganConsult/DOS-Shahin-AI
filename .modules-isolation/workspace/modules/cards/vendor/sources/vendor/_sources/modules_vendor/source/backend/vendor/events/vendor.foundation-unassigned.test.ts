/**
 * F-007 — vendor subscriber for foundation.position.holder.unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
  emptyResult: { rows: [] },
  query: vi.fn(),
  safeQueryWithClient: vi.fn(),
  withTransaction: vi.fn(),
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

import { getSubscriptionHandlers } from './vendor.subscribers';

const { safeQueryMock, createProcessTaskMock } = mocks;

describe('F-007 vendor ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
  });

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('clears assigned_to on vendor_due_diligence and creates reassignment tasks', async () => {
    safeQueryMock.mockResolvedValueOnce({
      rows: [{ id: 'd_1', vendor_id: 'v_1' }, { id: 'd_2', vendor_id: 'v_2' }],
    });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);

    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".vendor_due_diligence');
    expect(sql).toContain('assigned_to = NULL');
    expect(params).toEqual(['u_42']);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'vendor_reassignment',
      entityType: 'vendor',
      entityId: 'v_1',
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
