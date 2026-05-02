import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitReportingEvent, emitReportingStatusChange, emitReportCreated, emitReportScheduled, emitGenerationStarted, emitReportGenerated } from './reporting-event.service';

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
describe('Reporting Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitReportingEvent', () => {
    it('should publish event to event bus', () => {
      emitReportingEvent({
        tenantId: 't1',
        entityType: 'report' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitReportingEvent({
        tenantId: 't1',
        entityType: 'report' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitReportingEvent({
        tenantId: 't1',
        entityType: 'report' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitReportingEvent({
        tenantId: 't1',
        entityType: 'report' as any,
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
      expect(() => emitReportingEvent({
        tenantId: 't1',
        entityType: 'report' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitReportingStatusChange', () => {
    it('should emit status_changed event', () => {
      emitReportingStatusChange('t1', 'report' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitReportCreated should not throw', () => {
      expect(() => emitReportCreated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitReportScheduled should not throw', () => {
      expect(() => emitReportScheduled('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitGenerationStarted should not throw', () => {
      expect(() => emitGenerationStarted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitReportGenerated should not throw', () => {
      expect(() => emitReportGenerated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
