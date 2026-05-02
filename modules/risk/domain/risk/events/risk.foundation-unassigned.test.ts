/**
 * F-002 — risk subscriber for foundation.position.holder.unassigned.
 *
 * Verifies the handler:
 *   1. is registered in the handler map
 *   2. nulls owner_user_id on risks owned by the vacated user
 *   3. creates a reassignment process task per orphaned risk
 *   4. is idempotent on second invocation
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
  registerLifecycleDefinition: vi.fn(),
  EntityStateMachine: class { can() { return true; } transition(_a: string, b: string) { return b; } getStates() { return []; } },
}));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../ports/events.port', () => ({
  eventBus: { subscribe: vi.fn() },
}));
vi.mock('../ports/platform.port', () => ({ SYSTEM_JOB_ACTOR: 'system' }));
vi.mock('../../../infrastructure/adapters/audit.adapter', () => ({
  recordAudit: mocks.recordAuditMock,
}));
vi.mock('@dos/platform-core/resilience', () => ({
  swallow: (_ec: unknown, p: unknown) => p,
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));
vi.mock('@dos/platform-core/shell/navigation/navigation-integration', () => ({
  registerNavigationIntegration: vi.fn(),
}));

import { getSubscriptionHandlers } from './risk.subscribers';

const { safeQueryMock, createProcessTaskMock, recordAuditMock } = mocks;

describe('F-002 risk ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
    recordAuditMock.mockReset();
  });

  it('registers handler for foundation.position.holder.unassigned', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('nulls owner and creates reassignment task per orphaned risk', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [{ risk_id: 'r_1' }, { risk_id: 'r_2' }] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;

    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);

    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".risks');
    expect(sql).toContain('owner_user_id = NULL');
    expect(params).toEqual(['u_42']);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'risk_reassignment',
      entityType: 'risk',
      entityId: 'r_1',
      triggerSource: 'foundation.position.holder.unassigned',
    });
  });

  it('is a no-op when payload has no userId', async () => {
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: {} } as any);
    expect(safeQueryMock).not.toHaveBeenCalled();
  });

  it('is idempotent — second run with no orphans does no work', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });
});
