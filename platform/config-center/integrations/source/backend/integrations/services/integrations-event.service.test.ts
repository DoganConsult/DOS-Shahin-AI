import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitIntegrationsEvent, emitIntegrationsStatusChange, emitSyncCompleted, emitSyncFailed, emitHealthCheckFailed, emitAuthExpired } from './integrations-event.service';

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
describe('Integrations Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitIntegrationsEvent', () => {
    it('should publish event to event bus', () => {
      emitIntegrationsEvent({
        tenantId: 't1',
        entityType: 'connector' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitIntegrationsEvent({
        tenantId: 't1',
        entityType: 'connector' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitIntegrationsEvent({
        tenantId: 't1',
        entityType: 'connector' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitIntegrationsEvent({
        tenantId: 't1',
        entityType: 'connector' as any,
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
      expect(() => emitIntegrationsEvent({
        tenantId: 't1',
        entityType: 'connector' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitIntegrationsStatusChange', () => {
    it('should emit status_changed event', () => {
      emitIntegrationsStatusChange('t1', 'connector' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitSyncCompleted should not throw', () => {
      expect(() => emitSyncCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitSyncFailed should not throw', () => {
      expect(() => emitSyncFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitHealthCheckFailed should not throw', () => {
      expect(() => emitHealthCheckFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitAuthExpired should not throw', () => {
      expect(() => emitAuthExpired('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
