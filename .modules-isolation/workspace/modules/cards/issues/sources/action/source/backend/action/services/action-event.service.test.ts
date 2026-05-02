import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitActionEvent, emitActionStatusChange, emitActionAssigned, emitActionCompleted, emitActionOverdue, emitActionEscalated } from './action-event.service';

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
describe('Action Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitActionEvent', () => {
    it('should publish event to event bus', () => {
      emitActionEvent({
        tenantId: 't1',
        entityType: 'action_item' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitActionEvent({
        tenantId: 't1',
        entityType: 'action_item' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitActionEvent({
        tenantId: 't1',
        entityType: 'action_item' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitActionEvent({
        tenantId: 't1',
        entityType: 'action_item' as any,
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
      expect(() => emitActionEvent({
        tenantId: 't1',
        entityType: 'action_item' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitActionStatusChange', () => {
    it('should emit status_changed event', () => {
      emitActionStatusChange('t1', 'action_item' as any, 'e1', 'open', 'in_progress', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitActionAssigned should not throw', () => {
      expect(() => emitActionAssigned('t1', 'id1', 'assignee-1', 'high', 'u1')).not.toThrow();
    });

    it('emitActionCompleted should not throw', () => {
      expect(() => emitActionCompleted('t1', 'id1', 'u1')).not.toThrow();
    });

    it('emitActionOverdue should not throw', () => {
      expect(() => emitActionOverdue('t1', 'id1', 2, 'high', 'u1')).not.toThrow();
    });

    it('emitActionEscalated should not throw', () => {
      expect(() => emitActionEscalated('t1', 'id1', 'manager-1', 'sla_breach', 'u1')).not.toThrow();
    });

  });
});
