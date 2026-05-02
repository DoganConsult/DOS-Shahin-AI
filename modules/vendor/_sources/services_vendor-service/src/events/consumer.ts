import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as vendorService from '../domain/vendor.service';
import { publishVendorCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/vendor.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/vendor/dist/vendor/events/vendor.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[vendor-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[vendor-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[vendor-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[vendor-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[vendor-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[vendor-service] Processing compliance.assessed: Update vendor compliance status after assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.vendor_id as string);
      if (entityId) {
        const existing = await vendorService.getById(tenantId, entityId);
        if (existing) {
          await vendorService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[vendor-service] updateVendorCompliance: updated vendor`, { entityId, tenantId });
        }
      } else {
        const items = await vendorService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await vendorService.update(tenantId, (item as any).vendor_id, {
            status: 'under-review',
          });
        }
        logger.info(`[vendor-service] updateVendorCompliance: batch-reviewed vendor items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateVendorCompliance',
        'vendor',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[vendor-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[vendor-service] Processing incident.created: Check vendor involvement in incidents`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.vendor_id as string);
      if (entityId) {
        const existing = await vendorService.getById(tenantId, entityId);
        if (existing) {
          await vendorService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[vendor-service] checkVendorInvolvement: updated vendor`, { entityId, tenantId });
        }
      } else {
        const items = await vendorService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await vendorService.update(tenantId, (item as any).vendor_id, {
            status: 'under-review',
          });
        }
        logger.info(`[vendor-service] checkVendorInvolvement: batch-reviewed vendor items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'checkVendorInvolvement',
        'vendor',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[vendor-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('asset.vulnerability.detected', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[vendor-service] Processing asset.vulnerability.detected: Assess vendor impact from asset vulnerability`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.vendor_id as string);
      if (entityId) {
        const existing = await vendorService.getById(tenantId, entityId);
        if (existing) {
          await vendorService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[vendor-service] assessVendorImpact: updated vendor`, { entityId, tenantId });
        }
      } else {
        const items = await vendorService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await vendorService.update(tenantId, (item as any).vendor_id, {
            status: 'under-review',
          });
        }
        logger.info(`[vendor-service] assessVendorImpact: batch-reviewed vendor items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'assessVendorImpact',
        'vendor',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'asset.vulnerability.detected', payload },
      );
    } catch (err) {
      logger.error(`[vendor-service] Failed to process asset.vulnerability.detected`, { eventId: envelope.eventId, error: err });
    }
  });
}
