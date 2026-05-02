import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitAgrcEngineEvent, emitAgrcEngineStatusChange, emitRunStarted, emitRunFailed, emitConfigChanged } from './agrc-engine-event.service';

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
describe('AgrcEngine Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitAgrcEngineEvent', () => {
    it('should publish event to event bus', () => {
      emitAgrcEngineEvent({
        tenantId: 't1',
        entityType: 'run' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitAgrcEngineEvent({
        tenantId: 't1',
        entityType: 'run' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitAgrcEngineEvent({
        tenantId: 't1',
        entityType: 'run' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitAgrcEngineEvent({
        tenantId: 't1',
        entityType: 'run' as any,
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
      expect(() => emitAgrcEngineEvent({
        tenantId: 't1',
        entityType: 'run' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitAgrcEngineStatusChange', () => {
    it('should emit status_changed event', () => {
      emitAgrcEngineStatusChange('t1', 'run' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitRunStarted should not throw', () => {
      expect(() => emitRunStarted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitRunFailed should not throw', () => {
      expect(() => emitRunFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitConfigChanged should not throw', () => {
      expect(() => emitConfigChanged('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
