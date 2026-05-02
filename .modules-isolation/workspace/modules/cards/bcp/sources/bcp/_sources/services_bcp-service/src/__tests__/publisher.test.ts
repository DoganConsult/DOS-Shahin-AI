import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishBcpPlanCreated, publishBcpPlanActivated, publishBcpExerciseCompleted, publishBcpPlanReviewed } from '../events/publisher';

describe('bcp-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishBcpPlanCreated publishes event', async () => {
    await publishBcpPlanCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishBcpPlanActivated publishes event', async () => {
    await publishBcpPlanActivated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishBcpExerciseCompleted publishes event', async () => {
    await publishBcpExerciseCompleted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishBcpPlanReviewed publishes event', async () => {
    await publishBcpPlanReviewed('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
