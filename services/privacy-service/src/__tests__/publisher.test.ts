import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishPrivacyAssessmentCreated, publishPrivacyDpiaCompleted, publishPrivacyBreachDetected, publishPrivacyConsentUpdated } from '../events/publisher';

describe('privacy-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishPrivacyAssessmentCreated publishes event', async () => {
    await publishPrivacyAssessmentCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishPrivacyDpiaCompleted publishes event', async () => {
    await publishPrivacyDpiaCompleted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishPrivacyBreachDetected publishes event', async () => {
    await publishPrivacyBreachDetected('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishPrivacyConsentUpdated publishes event', async () => {
    await publishPrivacyConsentUpdated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
