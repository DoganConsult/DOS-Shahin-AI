/**
 * F-003 — asset subscriber for foundation.position.holder.unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
  recordAuditMock: vi.fn(async () => undefined),
}));

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
vi.mock('../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: mocks.recordAuditMock,
}));
vi.mock('@dos/platform-core/resilience', () => ({
  swallow: (_ec: unknown, p: unknown) => p,
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { getSubscriptionHandlers } from './asset.subscribers';

const { safeQueryMock, createProcessTaskMock } = mocks;

describe('F-003 asset ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
  });

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('revokes asset_owners and creates reassignment tasks', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [{ entity_id: 'a_1' }, { entity_id: 'a_2' }] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);

    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".asset_owners');
    expect(sql).toContain('revoked_at = NOW()');
    expect(params).toEqual(['u_42']);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'asset_reassignment',
      entityType: 'asset',
      entityId: 'a_1',
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
