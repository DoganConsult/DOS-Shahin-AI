import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as doraAssessmentService from '../domain/dora-assessment.service';
import { publishDoraAssessmentCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/dora.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/dora/dist/dora/events/dora.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[dora-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[dora-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[dora-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[dora-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[dora-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[dora-service] Processing incident.created: Flag DORA assessment when ICT incident created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await doraAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await doraAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[dora-service] flagDoraAssessment: updated dora-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await doraAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await doraAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[dora-service] flagDoraAssessment: batch-reviewed dora-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'flagDoraAssessment',
        'dora-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[dora-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('vendor.risk.elevated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[dora-service] Processing vendor.risk.elevated: Trigger ICT risk review when vendor risk elevated`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await doraAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await doraAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[dora-service] triggerIctRiskReview: updated dora-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await doraAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await doraAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[dora-service] triggerIctRiskReview: batch-reviewed dora-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerIctRiskReview',
        'dora-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'vendor.risk.elevated', payload },
      );
    } catch (err) {
      logger.error(`[dora-service] Failed to process vendor.risk.elevated`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[dora-service] Processing compliance.assessed: Update DORA compliance status after compliance assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await doraAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await doraAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[dora-service] updateDoraCompliance: updated dora-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await doraAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await doraAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[dora-service] updateDoraCompliance: batch-reviewed dora-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateDoraCompliance',
        'dora-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[dora-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });
}
