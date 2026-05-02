import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitRemediationEvent, emitRemediationStatusChange, emitVerificationRequested, emitVerificationPassed, emitVerificationFailed, emitMilestoneReached } from './remediation-event.service';

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
describe('Remediation Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitRemediationEvent', () => {
    it('should publish event to event bus', () => {
      emitRemediationEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitRemediationEvent({
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
      emitRemediationEvent({
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
      emitRemediationEvent({
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
      expect(() => emitRemediationEvent({
        tenantId: 't1',
        entityType: 'plan' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitRemediationStatusChange', () => {
    it('should emit status_changed event', () => {
      emitRemediationStatusChange('t1', 'plan' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitVerificationRequested should not throw', () => {
      expect(() => emitVerificationRequested('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitVerificationPassed should not throw', () => {
      expect(() => emitVerificationPassed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitVerificationFailed should not throw', () => {
      expect(() => emitVerificationFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitMilestoneReached should not throw', () => {
      expect(() => emitMilestoneReached('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
