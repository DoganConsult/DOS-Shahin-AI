import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitProactiveLeadershipEvent, emitProactiveLeadershipStatusChange, emitInsightGenerated, emitRecommendationIssued, emitAssessmentCompleted } from './proactive-leadership-event.service';

vi.mock('../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
import { eventBus } from '../ports/events.port';


vi.mock('../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
describe('ProactiveLeadership Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitProactiveLeadershipEvent', () => {
    it('should publish event to event bus', () => {
      emitProactiveLeadershipEvent({
        tenantId: 't1',
        entityType: 'config' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitProactiveLeadershipEvent({
        tenantId: 't1',
        entityType: 'config' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitProactiveLeadershipEvent({
        tenantId: 't1',
        entityType: 'config' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitProactiveLeadershipEvent({
        tenantId: 't1',
        entityType: 'config' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.timestamp).toBeDefined();
      expect(call.payload.eventVersion).toBe(1);
    });

    it('should not throw on publish failure', () => {
      (eventBus.publish as any).mockImplementationOnce(() => { throw new Error('fail'); });
      expect(() => emitProactiveLeadershipEvent({
        tenantId: 't1',
        entityType: 'config' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitProactiveLeadershipStatusChange', () => {
    it('should emit status_changed event', () => {
      emitProactiveLeadershipStatusChange('t1', 'config' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitInsightGenerated should not throw', () => {
      expect(() => emitInsightGenerated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitRecommendationIssued should not throw', () => {
      expect(() => emitRecommendationIssued('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitAssessmentCompleted should not throw', () => {
      expect(() => emitAssessmentCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
