import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitComplianceEvent, emitComplianceStatusChange, emitProgramCreated, emitProgramAssessed, emitProgramCompliant, emitProgramNonCompliant } from './compliance-event.service';

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
describe('Compliance Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitComplianceEvent', () => {
    it('should publish event to event bus', () => {
      emitComplianceEvent({
        tenantId: 't1',
        entityType: 'program' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitComplianceEvent({
        tenantId: 't1',
        entityType: 'program' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitComplianceEvent({
        tenantId: 't1',
        entityType: 'program' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitComplianceEvent({
        tenantId: 't1',
        entityType: 'program' as any,
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
      expect(() => emitComplianceEvent({
        tenantId: 't1',
        entityType: 'program' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitComplianceStatusChange', () => {
    it('should emit status_changed event', () => {
      emitComplianceStatusChange('t1', 'program' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitProgramCreated should not throw', () => {
      expect(() => emitProgramCreated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitProgramAssessed should not throw', () => {
      expect(() => emitProgramAssessed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitProgramCompliant should not throw', () => {
      expect(() => emitProgramCompliant('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitProgramNonCompliant should not throw', () => {
      expect(() => emitProgramNonCompliant('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
