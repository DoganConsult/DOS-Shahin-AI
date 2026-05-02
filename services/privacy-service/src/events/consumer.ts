import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as privacyAssessmentService from '../domain/privacy-assessment.service';
import { publishPrivacyAssessmentCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/privacy.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/privacy/dist/privacy/events/privacy.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[privacy-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[privacy-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[privacy-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[privacy-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[privacy-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[privacy-service] Processing compliance.assessed: Update privacy compliance after assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await privacyAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await privacyAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[privacy-service] updatePrivacyCompliance: updated privacy-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await privacyAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await privacyAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[privacy-service] updatePrivacyCompliance: batch-reviewed privacy-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updatePrivacyCompliance',
        'privacy-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[privacy-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[privacy-service] Processing incident.created: Check for privacy breach when incident created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await privacyAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await privacyAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[privacy-service] checkPrivacyBreach: updated privacy-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await privacyAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await privacyAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[privacy-service] checkPrivacyBreach: batch-reviewed privacy-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'checkPrivacyBreach',
        'privacy-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[privacy-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('asset.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[privacy-service] Processing asset.created: Trigger DPIA when new data-processing asset created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await privacyAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await privacyAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[privacy-service] triggerDpiaForDataAsset: updated privacy-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await privacyAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await privacyAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[privacy-service] triggerDpiaForDataAsset: batch-reviewed privacy-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerDpiaForDataAsset',
        'privacy-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'asset.created', payload },
      );
    } catch (err) {
      logger.error(`[privacy-service] Failed to process asset.created`, { eventId: envelope.eventId, error: err });
    }
  });
}
