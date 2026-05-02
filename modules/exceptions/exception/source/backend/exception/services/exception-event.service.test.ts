import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitExceptionEvent, emitExceptionStatusChange, emitExceptionSubmitted, emitExceptionApproved, emitExceptionExpired, emitExceptionRevoked } from './exception-event.service';

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
describe('Exception Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitExceptionEvent', () => {
    it('should publish event to event bus', () => {
      emitExceptionEvent({
        tenantId: 't1',
        entityType: 'exception_request' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitExceptionEvent({
        tenantId: 't1',
        entityType: 'exception_request' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitExceptionEvent({
        tenantId: 't1',
        entityType: 'exception_request' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitExceptionEvent({
        tenantId: 't1',
        entityType: 'exception_request' as any,
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
      expect(() => emitExceptionEvent({
        tenantId: 't1',
        entityType: 'exception_request' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitExceptionStatusChange', () => {
    it('should emit status_changed event', () => {
      emitExceptionStatusChange('t1', 'exception_request' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitExceptionSubmitted should not throw', () => {
      expect(() => emitExceptionSubmitted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitExceptionApproved should not throw', () => {
      expect(() => emitExceptionApproved('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitExceptionExpired should not throw', () => {
      expect(() => emitExceptionExpired('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitExceptionRevoked should not throw', () => {
      expect(() => emitExceptionRevoked('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
