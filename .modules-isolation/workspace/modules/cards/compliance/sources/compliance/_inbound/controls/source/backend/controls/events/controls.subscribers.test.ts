/**
 * F-001 — controls subscriber for foundation.position.holder.unassigned.
 *
 * Verifies the handler:
 *   1. is registered in the handler map
 *   2. nulls owner_user_id on controls owned by the vacated user
 *   3. creates a reassignment process task per orphaned control
 *   4. is idempotent on second invocation (no duplicate tasks beyond what
 *      the UPDATE returns)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
  recordAuditMock: vi.fn(async () => undefined),
}));
const { safeQueryMock, createProcessTaskMock, recordAuditMock } = mocks;

vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
}));
vi.mock('../ports/lifecycle.port', () => ({
  createProcessTask: mocks.createProcessTaskMock,
}));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../ports/events.port', () => ({
  eventBus: { subscribe: vi.fn() },
}));
vi.mock('../ports/platform.port', () => ({ SYSTEM_JOB_ACTOR: 'system' }));
vi.mock('../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: mocks.recordAuditMock,
}));
vi.mock('@dos/platform-core/resilience', () => ({
  swallow: (_ec: unknown, p: unknown) => p,
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { getSubscriptionHandlers } from './controls.subscribers';

describe('F-001 controls ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
    recordAuditMock.mockReset();
  });

  it('registers handler for foundation.position.holder.unassigned', () => {
    const handlers = getSubscriptionHandlers();
    expect(handlers.has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('nulls owner and creates reassignment task per orphaned control', async () => {
    safeQueryMock.mockResolvedValueOnce({
      rows: [{ control_id: 'ctrl_1' }, { control_id: 'ctrl_2' }],
    });
    const handlers = getSubscriptionHandlers();
    const handler = handlers.get('foundation.position.holder.unassigned')!;

    await handler({
      tenantId: 't_1',
      payload: { userId: 'u_42' },
    } as any);

    expect(safeQueryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".controls');
    expect(sql).toContain('owner_user_id = NULL');
    expect(params).toEqual(['u_42']);

    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'control_reassignment',
      entityType: 'control',
      entityId: 'ctrl_1',
      triggerSource: 'foundation.position.holder.unassigned',
    });
  });

  it('is a no-op when payload has no userId', async () => {
    const handlers = getSubscriptionHandlers();
    const handler = handlers.get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: {} } as any);
    expect(safeQueryMock).not.toHaveBeenCalled();
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('is idempotent — second run with no orphans does no work', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [] });
    const handlers = getSubscriptionHandlers();
    const handler = handlers.get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });
});
