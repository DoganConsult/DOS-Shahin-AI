import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as inboxItemService from '../domain/inbox-item.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/notification.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/notification/dist/notification/events/notification.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[notification-inbox-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[notification-inbox-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[notification-inbox-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[notification-inbox-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[notification-inbox-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('notification.sent', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[notification-inbox-service] Processing notification.sent: Create inbox item when notification sent`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await inboxItemService.create(tenantId, {
          title: (payload.title as string) || `Auto: notification.sent - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          user_id: (payload.userId as string) || (payload.assigneeId as string) || envelope.userId || '',
          entity_type: (payload.entityType as string) || envelope.source || 'system',
          status: 'open',
          body: `Auto-generated from notification.sent event (ID: ${envelope.eventId})`,
        });
        logger.info(`[notification-inbox-service] Auto-created inbox-item`, { id: created.item_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'InboxItem Created', `A new inbox-item was auto-created from notification.sent`, 'info', { entityId: created.item_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createInboxFromNotification',
        'inbox-item',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'notification.sent', payload },
      );
    } catch (err) {
      logger.error(`[notification-inbox-service] Failed to process notification.sent`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('workflow.task.assigned', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[notification-inbox-service] Processing workflow.task.assigned: Create inbox item when workflow task assigned`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await inboxItemService.create(tenantId, {
          title: (payload.title as string) || `Auto: workflow.task.assigned - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          user_id: (payload.userId as string) || (payload.assigneeId as string) || envelope.userId || '',
          entity_type: (payload.entityType as string) || envelope.source || 'system',
          status: 'open',
          body: `Auto-generated from workflow.task.assigned event (ID: ${envelope.eventId})`,
        });
        logger.info(`[notification-inbox-service] Auto-created inbox-item`, { id: created.item_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'InboxItem Created', `A new inbox-item was auto-created from workflow.task.assigned`, 'info', { entityId: created.item_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createInboxFromTask',
        'inbox-item',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'workflow.task.assigned', payload },
      );
    } catch (err) {
      logger.error(`[notification-inbox-service] Failed to process workflow.task.assigned`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[notification-inbox-service] Processing incident.created: Create inbox item for incident notification`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await inboxItemService.create(tenantId, {
          title: (payload.title as string) || `Auto: incident.created - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          user_id: (payload.userId as string) || (payload.assigneeId as string) || envelope.userId || '',
          entity_type: (payload.entityType as string) || envelope.source || 'system',
          status: 'open',
          body: `Auto-generated from incident.created event (ID: ${envelope.eventId})`,
        });
        logger.info(`[notification-inbox-service] Auto-created inbox-item`, { id: created.item_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'InboxItem Created', `A new inbox-item was auto-created from incident.created`, 'info', { entityId: created.item_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createInboxFromIncident',
        'inbox-item',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[notification-inbox-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('action.overdue', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[notification-inbox-service] Processing action.overdue: Create inbox item for overdue action notification`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await inboxItemService.create(tenantId, {
          title: (payload.title as string) || `Auto: action.overdue - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          user_id: (payload.userId as string) || (payload.assigneeId as string) || envelope.userId || '',
          entity_type: (payload.entityType as string) || envelope.source || 'system',
          status: 'open',
          body: `Auto-generated from action.overdue event (ID: ${envelope.eventId})`,
        });
        logger.info(`[notification-inbox-service] Auto-created inbox-item`, { id: created.item_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'InboxItem Created', `A new inbox-item was auto-created from action.overdue`, 'info', { entityId: created.item_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createInboxFromOverdueAction',
        'inbox-item',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'action.overdue', payload },
      );
    } catch (err) {
      logger.error(`[notification-inbox-service] Failed to process action.overdue`, { eventId: envelope.eventId, error: err });
    }
  });
}
