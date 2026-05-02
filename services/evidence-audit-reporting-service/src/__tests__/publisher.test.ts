import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, publishEvidenceSubmitted, publishEvidenceApproved, publishEvidenceRejected, publishAuditFindingCreated, publishAuditFindingResolved } from '../events/publisher';

describe('evidence-audit-reporting-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

  it('publishEvidenceSubmitted publishes event', async () => {
    await publishEvidenceSubmitted('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishEvidenceApproved publishes event', async () => {
    await publishEvidenceApproved('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishEvidenceRejected publishes event', async () => {
    await publishEvidenceRejected('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishAuditFindingCreated publishes event', async () => {
    await publishAuditFindingCreated('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });

  it('publishAuditFindingResolved publishes event', async () => {
    await publishAuditFindingResolved('t1', 'entity-1', 'arg2', 'arg3', 'arg4');
    expect(mockPublish).toHaveBeenCalled();
  });
});
