import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitAuditEvent, emitAuditStatusChange, emitAuditInitiated, emitAuditPlanned, emitAuditExecuted, emitAuditReported } from './audit-event.service';

vi.mock('../../../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
import { eventBus } from '../../../ports/events.port';


vi.mock('../../../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true)
}));
describe('Audit Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitAuditEvent', () => {
    it('should publish event to event bus', () => {
      emitAuditEvent({
        tenantId: 't1',
        entityType: 'audit' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitAuditEvent({
        tenantId: 't1',
        entityType: 'audit' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitAuditEvent({
        tenantId: 't1',
        entityType: 'audit' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitAuditEvent({
        tenantId: 't1',
        entityType: 'audit' as any,
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
      expect(() => emitAuditEvent({
        tenantId: 't1',
        entityType: 'audit' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitAuditStatusChange', () => {
    it('should emit status_changed event', () => {
      emitAuditStatusChange('t1', 'audit' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitAuditInitiated should not throw', () => {
      expect(() => emitAuditInitiated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitAuditPlanned should not throw', () => {
      expect(() => emitAuditPlanned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitAuditExecuted should not throw', () => {
      expect(() => emitAuditExecuted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitAuditReported should not throw', () => {
      expect(() => emitAuditReported('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
