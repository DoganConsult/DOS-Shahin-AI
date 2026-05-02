import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitIncidentEvent, emitIncidentStatusChange, emitIncidentDetected, emitSlaBreach, emitSeverityChanged, emitRootCauseIdentified } from './incident-event.service';

vi.mock('../../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
import { eventBus } from '../../ports/events.port';


vi.mock('../../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
describe('Incident Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitIncidentEvent', () => {
    it('should publish event to event bus', () => {
      emitIncidentEvent({
        tenantId: 't1',
        entityType: 'incident' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitIncidentEvent({
        tenantId: 't1',
        entityType: 'incident' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitIncidentEvent({
        tenantId: 't1',
        entityType: 'incident' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitIncidentEvent({
        tenantId: 't1',
        entityType: 'incident' as any,
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
      expect(() => emitIncidentEvent({
        tenantId: 't1',
        entityType: 'incident' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitIncidentStatusChange', () => {
    it('should emit status_changed event', () => {
      emitIncidentStatusChange('t1', 'incident' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitIncidentDetected should not throw', () => {
      expect(() => emitIncidentDetected('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitSlaBreach should not throw', () => {
      expect(() => emitSlaBreach('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitSeverityChanged should not throw', () => {
      expect(() => emitSeverityChanged('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitRootCauseIdentified should not throw', () => {
      expect(() => emitRootCauseIdentified('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
