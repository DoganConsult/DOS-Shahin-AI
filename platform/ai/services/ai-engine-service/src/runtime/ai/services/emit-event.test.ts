import { describe, it, expect, vi } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue(undefined);
vi.mock('../ports/events.port', () => ({
  eventBus: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import { emitModuleEvent } from './emit-event';

describe('AI emitModuleEvent', () => {
  it('publishes to platform event bus with correct format', async () => {
    await emitModuleEvent({
      tenantId: 't-001',
      userId: 'u-001',
      module: 'risk',
      event: 'created',
      entityType: 'risk',
      entityId: 'r-001',
    });

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'risk.created',
        tenantId: 't-001',
        severity: 'info',
        payload: expect.objectContaining({
          userId: 'u-001',
          entityType: 'risk',
          entityId: 'r-001',
        }),
      }),
    );
  });

  it('does not throw on publish failure', async () => {
    mockPublish.mockRejectedValueOnce(new Error('bus down'));
    await expect(
      emitModuleEvent({
        tenantId: 't-001', userId: 'u-001', module: 'ai',
        event: 'failed', entityType: 'agent', entityId: 'a-001',
      }),
    ).resolves.not.toThrow();
  });
});
