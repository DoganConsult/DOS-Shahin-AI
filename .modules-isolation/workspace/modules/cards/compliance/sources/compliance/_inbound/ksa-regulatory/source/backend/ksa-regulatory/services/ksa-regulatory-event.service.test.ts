import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitKsaRegulatoryEvent, emitKsaRegulatoryStatusChange, emitObligationMapped, emitGapIdentified, emitReadinessAssessed } from './ksa-regulatory-event.service';

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
describe('KsaRegulatory Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitKsaRegulatoryEvent', () => {
    it('should publish event to event bus', () => {
      emitKsaRegulatoryEvent({
        tenantId: 't1',
        entityType: 'obligation' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitKsaRegulatoryEvent({
        tenantId: 't1',
        entityType: 'obligation' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitKsaRegulatoryEvent({
        tenantId: 't1',
        entityType: 'obligation' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitKsaRegulatoryEvent({
        tenantId: 't1',
        entityType: 'obligation' as any,
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
      expect(() => emitKsaRegulatoryEvent({
        tenantId: 't1',
        entityType: 'obligation' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitKsaRegulatoryStatusChange', () => {
    it('should emit status_changed event', () => {
      emitKsaRegulatoryStatusChange('t1', 'obligation' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitObligationMapped should not throw', () => {
      expect(() => emitObligationMapped('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitGapIdentified should not throw', () => {
      expect(() => emitGapIdentified('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitReadinessAssessed should not throw', () => {
      expect(() => emitReadinessAssessed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
