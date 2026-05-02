import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitInboxEvent, emitInboxStatusChange, emitMessageRead, emitMessageActioned, emitBroadcastSent, emitDigestSent } from './inbox-event.service';

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
describe('Inbox Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitInboxEvent', () => {
    it('should publish event to event bus', () => {
      emitInboxEvent({
        tenantId: 't1',
        entityType: 'message' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitInboxEvent({
        tenantId: 't1',
        entityType: 'message' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitInboxEvent({
        tenantId: 't1',
        entityType: 'message' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitInboxEvent({
        tenantId: 't1',
        entityType: 'message' as any,
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
      expect(() => emitInboxEvent({
        tenantId: 't1',
        entityType: 'message' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitInboxStatusChange', () => {
    it('should emit status_changed event', () => {
      emitInboxStatusChange('t1', 'message' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitMessageRead should not throw', () => {
      expect(() => emitMessageRead('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitMessageActioned should not throw', () => {
      expect(() => emitMessageActioned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitBroadcastSent should not throw', () => {
      expect(() => emitBroadcastSent('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitDigestSent should not throw', () => {
      expect(() => emitDigestSent('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
