import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

import { emitLocalKnowledgeEvent, emitLocalKnowledgeStatusChange, emitDocumentIngested, emitIndexRebuilt, emitIndexFailed } from './local-knowledge-event.service';

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
describe('LocalKnowledge Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitLocalKnowledgeEvent', () => {
    it('should publish event to event bus', () => {
      emitLocalKnowledgeEvent({
        tenantId: 't1',
        entityType: 'document' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should include correlationId in payload', () => {
      emitLocalKnowledgeEvent({
        tenantId: 't1',
        entityType: 'document' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
        correlationId: 'corr-123',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBe('corr-123');
    });

    it('should auto-generate correlationId if not provided', () => {
      emitLocalKnowledgeEvent({
        tenantId: 't1',
        entityType: 'document' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      });
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.correlationId).toBeDefined();
    });

    it('should include timestamp and eventVersion', () => {
      emitLocalKnowledgeEvent({
        tenantId: 't1',
        entityType: 'document' as any,
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
      expect(() => emitLocalKnowledgeEvent({
        tenantId: 't1',
        entityType: 'document' as any,
        entityId: 'e1',
        action: 'created' as any,
        triggeredBy: 'u1',
      })).not.toThrow();
    });
  });

  describe('emitLocalKnowledgeStatusChange', () => {
    it('should emit status_changed event', () => {
      emitLocalKnowledgeStatusChange('t1', 'document' as any, 'e1', 'draft', 'active', 'u1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const call = (eventBus.publish as any).mock.calls[0][0];
      expect(call.payload.action).toBe('status_changed');
    });
  });

  describe('helper functions', () => {
    it('emitDocumentIngested should not throw', () => {
      expect(() => emitDocumentIngested('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitIndexRebuilt should not throw', () => {
      expect(() => emitIndexRebuilt('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

    it('emitIndexFailed should not throw', () => {
      expect(() => emitIndexFailed('t1', 'id1', 'test' as any, 'u1')).not.toThrow();
    });

  });
});
