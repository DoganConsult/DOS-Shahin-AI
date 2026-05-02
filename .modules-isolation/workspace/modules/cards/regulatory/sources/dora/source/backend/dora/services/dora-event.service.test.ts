import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../../utils/resilient-catch', () => ({
  swallow: vi.fn((_ec: any, promise: any) => Promise.resolve(promise).catch(catchHandler(EC.EVENT_BUS))),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { emitDoraEvent, emitDoraStatusChange, DORA_EVENTS } from './dora-event.service';

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
describe('Dora Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitDoraEvent', () => {
    it('should publish event to event bus', async () => {
      await emitDoraEvent('t1', DORA_EVENTS.ICT_ASSET_CREATED, 'ict_asset', 'e1', { key: 'val' });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include tenantId and sourceService', async () => {
      await emitDoraEvent('t1', DORA_EVENTS.ICT_ASSET_CREATED, 'ict_asset', 'e1');
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.tenantId).toBe('t1');
      expect(call.sourceService).toBe('dora');
    });

    it('should pass severity parameter', async () => {
      await emitDoraEvent('t1', DORA_EVENTS.ICT_ASSET_CREATED, 'ict_asset', 'e1', {}, 'critical');
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.severity).toBe('critical');
    });

    it('should default severity to info', async () => {
      await emitDoraEvent('t1', DORA_EVENTS.ICT_ASSET_CREATED, 'ict_asset', 'e1');
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.severity).toBe('info');
    });

    it('should not throw on publish failure', async () => {
      (eventBus.publish as any).mockRejectedValueOnce(new Error('fail'));
      await expect(emitDoraEvent('t1', DORA_EVENTS.ICT_ASSET_CREATED, 'ict_asset', 'e1')).resolves.not.toThrow();
    });
  });

  describe('emitDoraStatusChange', () => {
    it('should emit status_changed event', async () => {
      await emitDoraStatusChange('t1', 'ict_asset', 'e1', 'draft', 'active');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('DORA_EVENTS', () => {
    it('should define event type constants', () => {
      expect(DORA_EVENTS.ICT_ASSET_CREATED).toBe('dora.ict_asset_created');
      expect(DORA_EVENTS.RESILIENCE_TEST_FAILED).toBe('dora.resilience_test_failed');
      expect(DORA_EVENTS.STATUS_CHANGED).toBe('dora.status_changed');
    });
  });

  describe('helper functions', () => {
    it('should have convenience helpers defined', () => {
      expect(typeof emitDoraEvent).toBe('function');
      expect(typeof emitDoraStatusChange).toBe('function');
    });
  });
});
