import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn();
vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import {
  emitNotificationEvent,
  emitNotificationStatusChange,
  emitNotificationSent,
  emitNotificationFailed,
  emitNotificationDelivered,
  emitDigestCompiled,
  emitChannelHealthCheck,
} from './notification-event.service';

const TENANT = 'test-tenant';
const USER = 'user-001';

describe('NotificationEventService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('emitNotificationEvent()', () => {
    it('publishes event with correct structure', () => {
      emitNotificationEvent({ tenantId: TENANT, entityType: 'notification', entityId: 'n-1', action: 'created', triggeredBy: USER });
      expect(mockPublish).toHaveBeenCalledTimes(1);
      const call = mockPublish.mock.calls[0][0];
      expect(call.eventType).toBe('notification.notification.created');
      expect(call.sourceService).toBe('notification');
      expect(call.payload.eventVersion).toBe(1);
    });

    it('assigns critical severity for failed action', () => {
      emitNotificationEvent({ tenantId: TENANT, entityType: 'notification', entityId: 'n-1', action: 'failed', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('critical');
    });

    it('assigns warning severity for bounced action', () => {
      emitNotificationEvent({ tenantId: TENANT, entityType: 'notification', entityId: 'n-1', action: 'bounced', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('warning');
    });

    it('assigns info severity for sent action', () => {
      emitNotificationEvent({ tenantId: TENANT, entityType: 'notification', entityId: 'n-1', action: 'sent', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('info');
    });

    it('does not throw when publish fails', () => {
      mockPublish.mockImplementationOnce(() => { throw new Error('down'); });
      expect(() => emitNotificationEvent({ tenantId: TENANT, entityType: 'notification', entityId: 'n-1', action: 'created', triggeredBy: USER })).not.toThrow();
    });
  });

  describe('convenience helpers', () => {
    it('emitNotificationStatusChange publishes status_changed', () => {
      emitNotificationStatusChange(TENANT, 'notification', 'n-1', 'pending' as any, 'sent' as any, USER);
      expect(mockPublish.mock.calls[0][0].payload.action).toBe('status_changed');
    });

    it('emitNotificationSent includes channel and recipientId', () => {
      emitNotificationSent(TENANT, 'n-1', 'email', 'r-1', USER);
      const p = mockPublish.mock.calls[0][0].payload;
      expect(p.channel).toBe('email');
      expect(p.recipientId).toBe('r-1');
    });

    it('emitNotificationFailed includes errorReason', () => {
      emitNotificationFailed(TENANT, 'n-1', 'sms', 'timeout', USER);
      expect(mockPublish.mock.calls[0][0].payload.errorReason).toBe('timeout');
    });

    it('emitNotificationDelivered publishes delivered', () => {
      emitNotificationDelivered(TENANT, 'n-1', 'push', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('notification.notification.delivered');
    });

    it('emitDigestCompiled includes counts', () => {
      emitDigestCompiled(TENANT, 'dig-1', 10, 25, USER);
      const p = mockPublish.mock.calls[0][0].payload;
      expect(p.recipientCount).toBe(10);
      expect(p.notificationCount).toBe(25);
    });

    it('emitChannelHealthCheck includes health status', () => {
      emitChannelHealthCheck(TENANT, 'ch-1', 'email', true, USER);
      expect(mockPublish.mock.calls[0][0].payload.isHealthy).toBe(true);
    });
  });
});
