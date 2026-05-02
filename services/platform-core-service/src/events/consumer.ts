import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as mobileSessionService from '../domain/mobile-session.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('user.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[platform-core-service] Processing user.created: Prepare mobile access configuration for new user`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.session_id as string);
      if (entityId) {
        const existing = await mobileSessionService.getById(tenantId, entityId);
        if (existing) {
          await mobileSessionService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[platform-core-service] prepareUserMobileAccess: updated mobile-session`, { entityId, tenantId });
        }
      } else {
        const items = await mobileSessionService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await mobileSessionService.update(tenantId, (item as any).session_id, {
            status: 'under-review',
          });
        }
        logger.info(`[platform-core-service] prepareUserMobileAccess: batch-reviewed mobile-session items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'prepareUserMobileAccess',
        'mobile-session',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'user.created', payload },
      );
    } catch (err) {
      logger.error(`[platform-core-service] Failed to process user.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('notification.sent', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[platform-core-service] Processing notification.sent: Push notification to active mobile sessions`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.session_id as string);
      if (entityId) {
        const existing = await mobileSessionService.getById(tenantId, entityId);
        if (existing) {
          await mobileSessionService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[platform-core-service] pushToActiveSessions: updated mobile-session`, { entityId, tenantId });
        }
      } else {
        const items = await mobileSessionService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await mobileSessionService.update(tenantId, (item as any).session_id, {
            status: 'under-review',
          });
        }
        logger.info(`[platform-core-service] pushToActiveSessions: batch-reviewed mobile-session items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'pushToActiveSessions',
        'mobile-session',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'notification.sent', payload },
      );
    } catch (err) {
      logger.error(`[platform-core-service] Failed to process notification.sent`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('tenant.settings.changed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[platform-core-service] Processing tenant.settings.changed: Update mobile session config when tenant settings change`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.session_id as string);
      if (entityId) {
        const existing = await mobileSessionService.getById(tenantId, entityId);
        if (existing) {
          await mobileSessionService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[platform-core-service] updateSessionConfig: updated mobile-session`, { entityId, tenantId });
        }
      } else {
        const items = await mobileSessionService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await mobileSessionService.update(tenantId, (item as any).session_id, {
            status: 'under-review',
          });
        }
        logger.info(`[platform-core-service] updateSessionConfig: batch-reviewed mobile-session items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateSessionConfig',
        'mobile-session',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'tenant.settings.changed', payload },
      );
    } catch (err) {
      logger.error(`[platform-core-service] Failed to process tenant.settings.changed`, { eventId: envelope.eventId, error: err });
    }
  });
}
