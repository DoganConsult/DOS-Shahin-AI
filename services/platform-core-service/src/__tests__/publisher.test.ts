import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishMobileSessionStarted, publishMobileSessionEnded, publishMobilePushRegistered } from '../events/publisher';

describe('platform-core-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishMobileSessionStarted publishes event', async () => {
    await publishMobileSessionStarted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishMobileSessionEnded publishes event', async () => {
    await publishMobileSessionEnded('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishMobilePushRegistered publishes event', async () => {
    await publishMobilePushRegistered('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
