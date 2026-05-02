import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitAssetEvent, emitAssetStatusChange, emitAssetClassified, emitCriticalityChanged, emitScanCompleted, emitOwnerChanged } from './asset-event.service';

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
describe('Asset Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitAssetEvent', () => {
    it('should publish event to event bus', () => {
      emitAssetEvent({
        tenantId: 't1',
        entityType: 'asset' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitAssetEvent({
        tenantId: 't1',
        entityType: 'asset' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitAssetEvent({
        tenantId: 't1',
        entityType: 'asset' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitAssetEvent({
        tenantId: 't1',
        entityType: 'asset' as any,
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
      expect(() => emitAssetEvent({
        tenantId: 't1',
        entityType: 'asset' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitAssetStatusChange', () => {
    it('should emit status_changed event', () => {
      emitAssetStatusChange('t1', 'asset' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitAssetClassified should not throw', () => {
      expect(() => emitAssetClassified('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitCriticalityChanged should not throw', () => {
      expect(() => emitCriticalityChanged('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitScanCompleted should not throw', () => {
      expect(() => emitScanCompleted('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitOwnerChanged should not throw', () => {
      expect(() => emitOwnerChanged('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
