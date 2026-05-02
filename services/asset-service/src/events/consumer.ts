import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as assetService from '../domain/asset.service';
import { publishAssetCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/asset.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/asset/dist/asset/events/asset.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[asset-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[asset-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[asset-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[asset-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[asset-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('risk.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[asset-service] Processing risk.created: Update asset risk profile when new risk created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.asset_id as string);
      if (entityId) {
        const existing = await assetService.getById(tenantId, entityId);
        if (existing) {
          await assetService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[asset-service] updateAssetRiskProfile: updated asset`, { entityId, tenantId });
        }
      } else {
        const items = await assetService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await assetService.update(tenantId, (item as any).asset_id, {
            status: 'under-review',
          });
        }
        logger.info(`[asset-service] updateAssetRiskProfile: batch-reviewed asset items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateAssetRiskProfile',
        'asset',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.created', payload },
      );
    } catch (err) {
      logger.error(`[asset-service] Failed to process risk.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[asset-service] Processing incident.created: Link incident to affected assets`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.asset_id as string);
      if (entityId) {
        const existing = await assetService.getById(tenantId, entityId);
        if (existing) {
          await assetService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[asset-service] linkIncidentToAssets: updated asset`, { entityId, tenantId });
        }
      } else {
        const items = await assetService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await assetService.update(tenantId, (item as any).asset_id, {
            status: 'under-review',
          });
        }
        logger.info(`[asset-service] linkIncidentToAssets: batch-reviewed asset items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'linkIncidentToAssets',
        'asset',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[asset-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('vendor.assessment.completed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[asset-service] Processing vendor.assessment.completed: Update asset vendor status after vendor assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.asset_id as string);
      if (entityId) {
        const existing = await assetService.getById(tenantId, entityId);
        if (existing) {
          await assetService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[asset-service] updateAssetVendorStatus: updated asset`, { entityId, tenantId });
        }
      } else {
        const items = await assetService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await assetService.update(tenantId, (item as any).asset_id, {
            status: 'under-review',
          });
        }
        logger.info(`[asset-service] updateAssetVendorStatus: batch-reviewed asset items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateAssetVendorStatus',
        'asset',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'vendor.assessment.completed', payload },
      );
    } catch (err) {
      logger.error(`[asset-service] Failed to process vendor.assessment.completed`, { eventId: envelope.eventId, error: err });
    }
  });
}
