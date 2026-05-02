import { RedisStreamEventBus } from '@dos/platform-core/events';
import { recordAuditEntry } from './services/audit.service';

const PLATFORM_EVENTS = [
  'auth.session.created',
  'auth.session.expired',
  'auth.login.success',
  'auth.login.failure',
  'auth.logout',
  'auth.password.changed',
  'auth.mfa.enabled',
  'auth.mfa.disabled',
  'tenant.created',
  'tenant.updated',
  'tenant.deleted',
  'tenant.user.invited',
  'tenant.user.removed',
  'tenant.user.role.changed',
  'workflow.task.assigned',
  'workflow.task.completed',
  'workflow.task.created',
  'workflow.task.cancelled',
  'notification.sent',
  'notification.read',
];

export function registerAuditConsumers(bus: RedisStreamEventBus): void {
  for (const eventType of PLATFORM_EVENTS) {
    bus.subscribe(eventType, async (event) => {
      try {
        await recordAuditEntry({
          tenantId: event.tenantId,
          actorId: event.userId,
          eventType: event.eventType,
          action: event.eventType,
          source: event.source,
          details: {
            eventId: event.eventId,
            payload: event.payload,
            timestamp: event.timestamp,
          },
        });
      } catch {}
    });
  }
}
