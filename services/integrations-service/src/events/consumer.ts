import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as integrationService from '../domain/integration.service';
import { cisoAssistant, openProject, govReady } from '../domain/connectors/enterprise-integrations';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/integrations.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/integrations/dist/integrations/events/integrations.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[integrations-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[integrations-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[integrations-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[integrations-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[integrations-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('tenant.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[integrations-service] Processing tenant.created: Provision default integrations for new tenant`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await integrationService.create(tenantId, {
          name: (payload.name as string) || `Auto: tenant.created - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          provider: (payload.provider as string) || 'internal',
          status: 'open',
          description: `Auto-generated from tenant.created event (ID: ${envelope.eventId})`,
        });
        logger.info(`[integrations-service] Auto-created integration`, { id: created.integration_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'Integration Created', `A new integration was auto-created from tenant.created`, 'info', { entityId: created.integration_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'provisionDefaultIntegrations',
        'integration',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'tenant.created', payload },
      );
    } catch (err) {
      logger.error(`[integrations-service] Failed to process tenant.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('asset.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[integrations-service] Processing asset.created: Trigger asset sync to connected integrations`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.integration_id as string);
      if (entityId) {
        const existing = await integrationService.getById(tenantId, entityId);
        if (existing) {
          await integrationService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[integrations-service] triggerAssetSync: updated integration`, { entityId, tenantId });
        }
      } else {
        const items = await integrationService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await integrationService.update(tenantId, (item as any).integration_id, {
            status: 'under-review',
          });
        }
        logger.info(`[integrations-service] triggerAssetSync: batch-reviewed integration items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerAssetSync',
        'integration',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'asset.created', payload },
      );
    } catch (err) {
      logger.error(`[integrations-service] Failed to process asset.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('vendor.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[integrations-service] Processing vendor.created: Trigger vendor sync to connected integrations`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.integration_id as string);
      if (entityId) {
        const existing = await integrationService.getById(tenantId, entityId);
        if (existing) {
          await integrationService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[integrations-service] triggerVendorSync: updated integration`, { entityId, tenantId });
        }
      } else {
        const items = await integrationService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await integrationService.update(tenantId, (item as any).integration_id, {
            status: 'under-review',
          });
        }
        logger.info(`[integrations-service] triggerVendorSync: batch-reviewed integration items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerVendorSync',
        'integration',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'vendor.created', payload },
      );
    } catch (err) {
      logger.error(`[integrations-service] Failed to process vendor.created`, { eventId: envelope.eventId, error: err });
    }
  });

  // ── Sync to Third-Party Enterprise Systems ──
  eventBus.subscribe('incident.created', async (envelope) => {
    try {
      const payload = envelope.payload as Record<string, unknown>;
      await cisoAssistant.syncRiskEvent(envelope.eventId, payload.severity as string || 'high');
    } catch (err) {
      logger.error(`[integrations-service] CISO Assistant sync failed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('remediation.task.created', async (envelope) => {
    try {
      const payload = envelope.payload as Record<string, unknown>;
      await openProject.createRemediationTask(envelope.eventId, payload.description as string || 'Auto-generated Remediation');
    } catch (err) {
      logger.error(`[integrations-service] OpenProject task creation failed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('tenant.created', async (envelope) => {
    try {
      await govReady.auditComplianceBaseline(envelope.tenantId);
    } catch (err) {
      logger.error(`[integrations-service] GovReady baseline sync failed`, { tenantId: envelope.tenantId, error: err });
    }
  });
}
