import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as productLicenseService from '../domain/product-license.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('tenant.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[platform-product-service] Processing tenant.created: Provision default license for new tenant`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await productLicenseService.create(tenantId, {
          product_code: (payload.productCode as string) || 'default',
          plan: (payload.plan as string) || 'starter',
          status: 'open',
        });
        logger.info(`[platform-product-service] Auto-created product-license`, { id: created.license_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'ProductLicense Created', `A new product-license was auto-created from tenant.created`, 'info', { entityId: created.license_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'provisionDefaultLicense',
        'product-license',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'tenant.created', payload },
      );
    } catch (err) {
      logger.error(`[platform-product-service] Failed to process tenant.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('tenant.updated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[platform-product-service] Processing tenant.updated: Sync license when tenant settings updated`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.license_id as string);
      if (entityId) {
        const existing = await productLicenseService.getById(tenantId, entityId);
        if (existing) {
          await productLicenseService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[platform-product-service] syncLicenseWithTenant: updated product-license`, { entityId, tenantId });
        }
      } else {
        const items = await productLicenseService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await productLicenseService.update(tenantId, (item as any).license_id, {
            status: 'under-review',
          });
        }
        logger.info(`[platform-product-service] syncLicenseWithTenant: batch-reviewed product-license items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'syncLicenseWithTenant',
        'product-license',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'tenant.updated', payload },
      );
    } catch (err) {
      logger.error(`[platform-product-service] Failed to process tenant.updated`, { eventId: envelope.eventId, error: err });
    }
  });
}
