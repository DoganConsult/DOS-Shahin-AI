import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({ safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('@dos/service-client', () => {
  class MockServiceClient {
    get = vi.fn().mockResolvedValue({ ok: true, data: { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true } });
    post = vi.fn().mockResolvedValue({ ok: true });
    put = vi.fn().mockResolvedValue({ ok: true });
    delete = vi.fn().mockResolvedValue({ ok: true });
    destroy = vi.fn();
  }
  return { ServiceClient: MockServiceClient, requestContext: { getStore: vi.fn() } };
});
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn() }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn() }));
vi.mock('../events/publisher', () => ({
  setServiceBus: vi.fn(),
  publishDomainEvent: vi.fn().mockResolvedValue(undefined),
  publishRiskCreated: vi.fn().mockResolvedValue(undefined),
  publishRiskUpdated: vi.fn().mockResolvedValue(undefined),
  publishRiskMitigated: vi.fn().mockResolvedValue(undefined),
  publishIncidentCreated: vi.fn().mockResolvedValue(undefined),
  publishIncidentResolved: vi.fn().mockResolvedValue(undefined),
  publishIncidentEscalated: vi.fn().mockResolvedValue(undefined),
}));

import { registerConsumers } from '../events/consumer';

describe('risk-incident-service event consumers', () => {
  let handlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();
    const mockBus = {
      subscribe: vi.fn((event: string, handler: Function) => {
        handlers.set(event, handler);
      }),
    };
    registerConsumers(mockBus as any);
  });

  it('registers all expected event subscriptions', () => {
    const expectedEvents = ["compliance.control.failed","asset.vulnerability.detected","vendor.risk.elevated"];
    for (const event of expectedEvents) {
      expect(handlers.has(event), `Missing handler for ${event}`).toBe(true);
    }
  });

  it('handles compliance.control.failed without throwing', async () => {
    const handler = handlers.get('compliance.control.failed');
    expect(handler).toBeDefined();
    await expect(handler!({
      eventId: 'evt-1',
      eventType: 'compliance.control.failed',
      tenantId: 't1',
      userId: 'u1',
      payload: { title: 'Test', category: 'auto', severity: 'medium', type: 'test' },
      timestamp: new Date().toISOString(),
      source: 'test',
      idempotencyKey: 'idem-1',
      version: 1,
    })).resolves.not.toThrow();
  });

  it('handles asset.vulnerability.detected without throwing', async () => {
    const handler = handlers.get('asset.vulnerability.detected');
    expect(handler).toBeDefined();
    await expect(handler!({
      eventId: 'evt-1',
      eventType: 'asset.vulnerability.detected',
      tenantId: 't1',
      userId: 'u1',
      payload: { title: 'Test', category: 'auto', severity: 'medium', type: 'test' },
      timestamp: new Date().toISOString(),
      source: 'test',
      idempotencyKey: 'idem-1',
      version: 1,
    })).resolves.not.toThrow();
  });

  it('handles vendor.risk.elevated without throwing', async () => {
    const handler = handlers.get('vendor.risk.elevated');
    expect(handler).toBeDefined();
    await expect(handler!({
      eventId: 'evt-1',
      eventType: 'vendor.risk.elevated',
      tenantId: 't1',
      userId: 'u1',
      payload: { title: 'Test', category: 'auto', severity: 'medium', type: 'test' },
      timestamp: new Date().toISOString(),
      source: 'test',
      idempotencyKey: 'idem-1',
      version: 1,
    })).resolves.not.toThrow();
  });
});
