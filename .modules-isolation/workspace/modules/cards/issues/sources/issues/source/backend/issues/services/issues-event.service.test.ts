import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitIssuesEvent, emitIssuesStatusChange, emitIssueAssigned, emitIssueEscalated, emitIssueResolved, emitIssueVerified } from './issues-event.service';

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
describe('Issues Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitIssuesEvent', () => {
    it('should publish event to event bus', () => {
      emitIssuesEvent({
        tenantId: 't1',
        entityType: 'issue' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitIssuesEvent({
        tenantId: 't1',
        entityType: 'issue' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitIssuesEvent({
        tenantId: 't1',
        entityType: 'issue' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitIssuesEvent({
        tenantId: 't1',
        entityType: 'issue' as any,
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
      expect(() => emitIssuesEvent({
        tenantId: 't1',
        entityType: 'issue' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitIssuesStatusChange', () => {
    it('should emit status_changed event', () => {
      emitIssuesStatusChange('t1', 'issue' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitIssueAssigned should not throw', () => {
      expect(() => emitIssueAssigned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitIssueEscalated should not throw', () => {
      expect(() => emitIssueEscalated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitIssueResolved should not throw', () => {
      expect(() => emitIssueResolved('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitIssueVerified should not throw', () => {
      expect(() => emitIssueVerified('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
