import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishQiyasAssessmentCreated, publishQiyasLevelChanged, publishQiyasRoadmapUpdated } from '../events/publisher';

describe('qiyas-journey-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishQiyasAssessmentCreated publishes event', async () => {
    await publishQiyasAssessmentCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishQiyasLevelChanged publishes event', async () => {
    await publishQiyasLevelChanged('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishQiyasRoadmapUpdated publishes event', async () => {
    await publishQiyasRoadmapUpdated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
