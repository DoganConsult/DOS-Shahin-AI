import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitRecordsEvent, emitRecordsStatusChange, emitLegalHoldPlaced, emitLegalHoldReleased, emitDisposalExecuted, emitRetentionAssigned } from './records-event.service';

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
describe('Records Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitRecordsEvent', () => {
    it('should publish event to event bus', () => {
      emitRecordsEvent({
        tenantId: 't1',
        entityType: 'record' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitRecordsEvent({
        tenantId: 't1',
        entityType: 'record' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitRecordsEvent({
        tenantId: 't1',
        entityType: 'record' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitRecordsEvent({
        tenantId: 't1',
        entityType: 'record' as any,
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
      expect(() => emitRecordsEvent({
        tenantId: 't1',
        entityType: 'record' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitRecordsStatusChange', () => {
    it('should emit status_changed event', () => {
      emitRecordsStatusChange('t1', 'record' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitLegalHoldPlaced should not throw', () => {
      expect(() => emitLegalHoldPlaced('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitLegalHoldReleased should not throw', () => {
      expect(() => emitLegalHoldReleased('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitDisposalExecuted should not throw', () => {
      expect(() => emitDisposalExecuted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitRetentionAssigned should not throw', () => {
      expect(() => emitRetentionAssigned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
