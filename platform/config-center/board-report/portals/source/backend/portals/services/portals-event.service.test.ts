import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitPortalsEvent, emitPortalsStatusChange, emitPortalProvisioned, emitPortalActivated, emitPortalDeactivated, emitTokenIssued } from './portals-event.service';

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
describe('Portals Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitPortalsEvent', () => {
    it('should publish event to event bus', () => {
      emitPortalsEvent({
        tenantId: 't1',
        entityType: 'portal' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitPortalsEvent({
        tenantId: 't1',
        entityType: 'portal' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitPortalsEvent({
        tenantId: 't1',
        entityType: 'portal' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitPortalsEvent({
        tenantId: 't1',
        entityType: 'portal' as any,
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
      expect(() => emitPortalsEvent({
        tenantId: 't1',
        entityType: 'portal' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitPortalsStatusChange', () => {
    it('should emit status_changed event', () => {
      emitPortalsStatusChange('t1', 'portal' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitPortalProvisioned should not throw', () => {
      expect(() => emitPortalProvisioned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitPortalActivated should not throw', () => {
      expect(() => emitPortalActivated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitPortalDeactivated should not throw', () => {
      expect(() => emitPortalDeactivated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitTokenIssued should not throw', () => {
      expect(() => emitTokenIssued('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
