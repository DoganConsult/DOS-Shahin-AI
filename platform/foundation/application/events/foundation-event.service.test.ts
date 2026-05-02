import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../ports/events.port', () => ({
  eventBus: { publish: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
  emitEvent: vi.fn().mockReturnValue(true),
  publishEvent: vi.fn().mockReturnValue(true),
}));

import { emitFoundationEvent, emitFoundationStatusChange, emitOrgRestructured, emitDepartmentCreated, emitPositionAssigned } from './foundation-event.service';
import { eventBus } from '../../ports/events.port';

describe('Foundation Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitFoundationEvent', () => {
    it('should publish event to event bus', () => {
      emitFoundationEvent({
        tenantId: 't1',
        entityType: 'organization' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitFoundationEvent({
        tenantId: 't1',
        entityType: 'organization' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitFoundationEvent({
        tenantId: 't1',
        entityType: 'organization' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitFoundationEvent({
        tenantId: 't1',
        entityType: 'organization' as any,
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
      expect(() => emitFoundationEvent({
        tenantId: 't1',
        entityType: 'organization' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitFoundationStatusChange', () => {
    it('should emit status_changed event', () => {
      emitFoundationStatusChange('t1', 'organization' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitOrgRestructured should not throw', () => {
      expect(() => emitOrgRestructured('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitDepartmentCreated should not throw', () => {
      expect(() => emitDepartmentCreated('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitPositionAssigned should not throw', () => {
      expect(() => emitPositionAssigned('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
