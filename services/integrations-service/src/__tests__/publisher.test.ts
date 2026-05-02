import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishIntegrationConnected, publishIntegrationSyncCompleted, publishIntegrationSyncFailed, publishIntegrationDisconnected } from '../events/publisher';

describe('integrations-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishIntegrationConnected publishes event', async () => {
    await publishIntegrationConnected('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishIntegrationSyncCompleted publishes event', async () => {
    await publishIntegrationSyncCompleted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishIntegrationSyncFailed publishes event', async () => {
    await publishIntegrationSyncFailed('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishIntegrationDisconnected publishes event', async () => {
    await publishIntegrationDisconnected('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
