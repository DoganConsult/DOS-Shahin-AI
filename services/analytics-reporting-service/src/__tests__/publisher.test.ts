import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishReportingReportGenerated, publishReportingReportDistributed, publishReportingScheduleTriggered } from '../events/publisher';

describe('analytics-reporting-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishReportingReportGenerated publishes event', async () => {
    await publishReportingReportGenerated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishReportingReportDistributed publishes event', async () => {
    await publishReportingReportDistributed('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishReportingScheduleTriggered publishes event', async () => {
    await publishReportingScheduleTriggered('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
