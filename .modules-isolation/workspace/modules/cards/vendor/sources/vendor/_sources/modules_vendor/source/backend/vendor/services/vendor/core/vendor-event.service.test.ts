import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitVendorEvent, emitVendorStatusChange, emitVendorSuspended, emitVendorTerminated, emitVendorWatchListed, emitVendorReinstated } from './vendor-event.service';

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
describe('Vendor Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitVendorEvent', () => {
    it('should publish event to event bus', () => {
      emitVendorEvent({
        tenantId: 't1',
        entityType: 'vendor' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitVendorEvent({
        tenantId: 't1',
        entityType: 'vendor' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitVendorEvent({
        tenantId: 't1',
        entityType: 'vendor' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitVendorEvent({
        tenantId: 't1',
        entityType: 'vendor' as any,
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
      expect(() => emitVendorEvent({
        tenantId: 't1',
        entityType: 'vendor' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitVendorStatusChange', () => {
    it('should emit status_changed event', () => {
      emitVendorStatusChange('t1', 'vendor' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitVendorSuspended should not throw', () => {
      expect(() => emitVendorSuspended('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitVendorTerminated should not throw', () => {
      expect(() => emitVendorTerminated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitVendorWatchListed should not throw', () => {
      expect(() => emitVendorWatchListed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitVendorReinstated should not throw', () => {
      expect(() => emitVendorReinstated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
