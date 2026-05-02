/**
 * Phase 3 — risk subscriber for foundation.scope_changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProcessTaskMock: vi.fn(async () => undefined),
  safeQueryMock: vi.fn(),
  recordAuditMock: vi.fn(async () => undefined),
}));

vi.mock('../ports/lifecycle.port', () => ({
  createProcessTask: mocks.createProcessTaskMock,
}));
vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn(),
}));
vi.mock('../ports/events.port', () => ({
  eventBus: { subscribe: vi.fn() },
}));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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

const { createProcessTaskMock } = mocks;

describe('Phase 3 risk ← foundation.scope_changed', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.scope_changed')).toBe(true);
  });

  it('creates one risk applicability recompute task per event', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', payload: { entityId: 'org_1', entityType: 'department' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'risk_applicability_recompute',
      entityType: 'department',
      entityId: 'org_1',
      triggerSource: 'foundation.scope_changed',
    });
  });

  it('no-op when payload has no entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to event.entityId when payload omits it', async () => {
    const h = getSubscriptionHandlers().get('foundation.scope_changed')!;
    await h({ tenantId: 't_1', entityId: 'org_2', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
  });
});
