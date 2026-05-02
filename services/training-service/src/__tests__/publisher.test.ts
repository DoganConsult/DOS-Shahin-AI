import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishTrainingAssigned, publishTrainingCompleted, publishTrainingOverdue, publishTrainingCertificateIssued } from '../events/publisher';

describe('training-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishTrainingAssigned publishes event', async () => {
    await publishTrainingAssigned('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishTrainingCompleted publishes event', async () => {
    await publishTrainingCompleted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishTrainingOverdue publishes event', async () => {
    await publishTrainingOverdue('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishTrainingCertificateIssued publishes event', async () => {
    await publishTrainingCertificateIssued('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
