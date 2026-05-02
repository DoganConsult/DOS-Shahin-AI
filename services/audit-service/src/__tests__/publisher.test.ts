import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setAuditBus, publishAuditEntryCreated } from '../events/publisher';

describe('audit-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuditBus({ publish: mockPublish } as any);
  });

  it('publishAuditEntryCreated publishes event', async () => {
    await publishAuditEntryCreated('t1', 'arg1', 'test.action', 'arg3');
    expect(mockPublish).toHaveBeenCalled();
  });
});
