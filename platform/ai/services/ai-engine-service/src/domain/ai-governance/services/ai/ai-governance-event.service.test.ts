import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitAiGovernanceEvent, emitAiGovernanceStatusChange } from './ai-governance-event.service';

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
describe('AiGovernance Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitAiGovernanceEvent', () => {
    it('should publish event to event bus', () => {
      emitAiGovernanceEvent({
        tenantId: 't1',
        entityType: 'model_registry' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitAiGovernanceEvent({
        tenantId: 't1',
        entityType: 'model_registry' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitAiGovernanceEvent({
        tenantId: 't1',
        entityType: 'model_registry' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitAiGovernanceEvent({
        tenantId: 't1',
        entityType: 'model_registry' as any,
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
      expect(() => emitAiGovernanceEvent({
        tenantId: 't1',
        entityType: 'model_registry' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitAiGovernanceStatusChange', () => {
    it('should emit status_changed event', () => {
      emitAiGovernanceStatusChange('t1', 'model_registry' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('should have convenience helpers defined', () => {
      expect(typeof emitAiGovernanceEvent).toBe('function');
      expect(typeof emitAiGovernanceStatusChange).toBe('function');
    });
  });
});
