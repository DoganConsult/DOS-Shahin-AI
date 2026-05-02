import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitWorkflowEvent, emitWorkflowStatusChange, emitInstanceStarted, emitInstanceFailed, emitSlaBreached } from './workflow-event.service';

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
describe('Workflow Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitWorkflowEvent', () => {
    it('should publish event to event bus', () => {
      emitWorkflowEvent({
        tenantId: 't1',
        entityType: 'definition' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitWorkflowEvent({
        tenantId: 't1',
        entityType: 'definition' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitWorkflowEvent({
        tenantId: 't1',
        entityType: 'definition' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitWorkflowEvent({
        tenantId: 't1',
        entityType: 'definition' as any,
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
      expect(() => emitWorkflowEvent({
        tenantId: 't1',
        entityType: 'definition' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitWorkflowStatusChange', () => {
    it('should emit status_changed event', () => {
      emitWorkflowStatusChange('t1', 'definition' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitInstanceStarted should not throw', () => {
      expect(() => emitInstanceStarted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitInstanceFailed should not throw', () => {
      expect(() => emitInstanceFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitSlaBreached should not throw', () => {
      expect(() => emitSlaBreached('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
