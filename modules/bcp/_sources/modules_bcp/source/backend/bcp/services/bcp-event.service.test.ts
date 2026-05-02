import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitBcpEvent, emitBcpStatusChange, emitTestCompleted, emitPlanInvoked, emitBiaCompleted, emitRtoRpoSet } from './bcp-event.service';

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
describe('Bcp Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitBcpEvent', () => {
    it('should publish event to event bus', () => {
      emitBcpEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitBcpEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitBcpEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitBcpEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
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
      expect(() => emitBcpEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitBcpStatusChange', () => {
    it('should emit status_changed event', () => {
      emitBcpStatusChange('t1', 'plan' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitTestCompleted should not throw', () => {
      expect(() => emitTestCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitPlanInvoked should not throw', () => {
      expect(() => emitPlanInvoked('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitBiaCompleted should not throw', () => {
      expect(() => emitBiaCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitRtoRpoSet should not throw', () => {
      expect(() => emitRtoRpoSet('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
