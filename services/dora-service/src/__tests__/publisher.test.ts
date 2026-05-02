import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishDoraAssessmentCreated, publishDoraAssessmentCompleted, publishDoraIctRiskIdentified } from '../events/publisher';

describe('dora-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishDoraAssessmentCreated publishes event', async () => {
    await publishDoraAssessmentCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishDoraAssessmentCompleted publishes event', async () => {
    await publishDoraAssessmentCompleted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishDoraIctRiskIdentified publishes event', async () => {
    await publishDoraIctRiskIdentified('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
