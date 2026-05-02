import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitControlsEvent, emitControlsStatusChange, emitTestCompleted, emitDeficiencyDetected, emitEffectivenessAssessed } from './controls-event.service';

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
describe('Controls Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitControlsEvent', () => {
    it('should publish event to event bus', () => {
      emitControlsEvent({
        tenantId: 't1',
        entityType: 'control' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitControlsEvent({
        tenantId: 't1',
        entityType: 'control' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitControlsEvent({
        tenantId: 't1',
        entityType: 'control' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitControlsEvent({
        tenantId: 't1',
        entityType: 'control' as any,
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
      expect(() => emitControlsEvent({
        tenantId: 't1',
        entityType: 'control' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitControlsStatusChange', () => {
    it('should emit status_changed event', () => {
      emitControlsStatusChange('t1', 'control' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitTestCompleted should not throw', () => {
      expect(() => emitTestCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitDeficiencyDetected should not throw', () => {
      expect(() => emitDeficiencyDetected('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitEffectivenessAssessed should not throw', () => {
      expect(() => emitEffectivenessAssessed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
