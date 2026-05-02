/**
 * F-006 — evidence subscriber for foundation.position.holder.unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(),
  createProcessTaskMock: vi.fn(async () => undefined),
  createEvidenceRequestMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn(),
  emptyResult: { rows: [] },
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
vi.mock('../services/workflow/evidence-request.service', () => ({
  createEvidenceRequest: mocks.createEvidenceRequestMock,
}));
vi.mock('@dos/platform-core/shell/navigation/navigation-integration', () => ({
  registerNavigationIntegration: vi.fn(),
}));

import { getSubscriptionHandlers } from './evidence.subscribers';

const { safeQueryMock, createProcessTaskMock } = mocks;

describe('F-006 evidence ← foundation.position.holder.unassigned', () => {
  beforeEach(() => {
    safeQueryMock.mockReset();
    createProcessTaskMock.mockReset();
  });

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.position.holder.unassigned')).toBe(true);
  });

  it('clears collected_by and creates collect tasks per orphaned evidence', async () => {
    safeQueryMock.mockResolvedValueOnce({ rows: [{ id: 'e_1' }, { id: 'e_2' }] });
    const handler = getSubscriptionHandlers().get('foundation.position.holder.unassigned')!;
    await handler({ tenantId: 't_1', payload: { userId: 'u_42' } } as any);

    const [sql, params] = safeQueryMock.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t_1".evidence_items');
    expect(sql).toContain('collected_by = NULL');
    expect(params).toEqual(['u_42']);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(2);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'evidence_reassignment',
      entityType: 'evidence_item',
      entityId: 'e_1',
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
