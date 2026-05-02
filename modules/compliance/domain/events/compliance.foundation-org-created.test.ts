/**
 * Phase 5 — compliance subscriber for foundation.org_created (F-041).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProcessTaskMock: vi.fn(async () => undefined),
  safeQueryMock: vi.fn(),
}));

vi.mock('../ports/lifecycle.port', () => ({ createProcessTask: mocks.createProcessTaskMock }));
vi.mock('../ports/database.port', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
  query: vi.fn(),
  emptyResult: { rows: [] },
  safeQueryWithClient: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock('../ports/events.port', () => ({ eventBus: { subscribe: vi.fn() } }));
vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../ports/platform.port', () => ({ SYSTEM_JOB_ACTOR: 'system' }));
vi.mock('../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn(async () => undefined),
}));
vi.mock('@dos/platform-core/resilience', () => ({ swallow: (fn: any) => fn, EC: {} }));
vi.mock('@dos/platform-core/shell/navigation/navigation-integration', () => ({
  registerNavigationIntegration: vi.fn(),
}));

import { getSubscriptionHandlers } from './compliance.subscribers';

const { createProcessTaskMock } = mocks;

describe('Phase 5 compliance ← foundation.org_created', () => {
  beforeEach(() => createProcessTaskMock.mockReset());

  it('registers handler', () => {
    expect(getSubscriptionHandlers().has('foundation.org_created')).toBe(true);
  });

  it('creates one applicability recompute task per event', async () => {
    const h = getSubscriptionHandlers().get('foundation.org_created')!;
    await h({ tenantId: 't_1', payload: { entityId: 'org_1' } } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
    expect(createProcessTaskMock.mock.calls[0][1]).toMatchObject({
      taskType: 'compliance_applicability_recompute',
      entityType: 'org_unit',
      entityId: 'org_1',
      triggerSource: 'foundation.org_created',
    });
  });

  it('no-op when payload has no entityId', async () => {
    const h = getSubscriptionHandlers().get('foundation.org_created')!;
    await h({ tenantId: 't_1', payload: {} } as any);
    expect(createProcessTaskMock).not.toHaveBeenCalled();
  });

  it('falls back to event.entityId when payload omits it', async () => {
    const h = getSubscriptionHandlers().get('foundation.org_created')!;
    await h({ tenantId: 't_1', entityId: 'org_2', payload: {} } as any);
    expect(createProcessTaskMock).toHaveBeenCalledTimes(1);
  });
});
