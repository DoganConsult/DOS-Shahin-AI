import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishExecutiveBriefingCreated, publishExecutiveBriefingDistributed, publishExecutiveAlertTriggered } from '../events/publisher';

describe('executive-intelligence-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishExecutiveBriefingCreated publishes event', async () => {
    await publishExecutiveBriefingCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishExecutiveBriefingDistributed publishes event', async () => {
    await publishExecutiveBriefingDistributed('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishExecutiveAlertTriggered publishes event', async () => {
    await publishExecutiveAlertTriggered('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
