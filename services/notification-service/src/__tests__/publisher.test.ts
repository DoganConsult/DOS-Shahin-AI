import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setNotificationBus, publishNotificationSent, publishNotificationRead } from '../events/publisher';

describe('notification-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNotificationBus({ publish: mockPublish } as any);
  });

  it('publishNotificationSent publishes event', async () => {
    await publishNotificationSent('t1', 'arg1', 'u1', 'arg3');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishNotificationRead publishes event', async () => {
    await publishNotificationRead('t1', 'arg1', 'u1');
    expect(mockPublish).toHaveBeenCalled();
  });
});
