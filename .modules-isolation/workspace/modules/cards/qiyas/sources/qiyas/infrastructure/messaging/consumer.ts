import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as maturityAssessmentService from '../../domain/maturity-assessment.service';
import { publishQiyasAssessmentCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/qiyas.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/qiyas/dist/qiyas/events/qiyas.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[qiyas-journey-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[qiyas-journey-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[qiyas-journey-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[qiyas-journey-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[qiyas-journey-service] Processing compliance.assessed: Update maturity score from compliance assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await maturityAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await maturityAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[qiyas-journey-service] updateMaturityFromCompliance: updated maturity-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await maturityAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await maturityAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[qiyas-journey-service] updateMaturityFromCompliance: batch-reviewed maturity-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateMaturityFromCompliance',
        'maturity-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[qiyas-journey-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('control.tested', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[qiyas-journey-service] Processing control.tested: Reassess maturity level after control test`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await maturityAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await maturityAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[qiyas-journey-service] reassessMaturityLevel: updated maturity-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await maturityAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await maturityAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[qiyas-journey-service] reassessMaturityLevel: batch-reviewed maturity-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'reassessMaturityLevel',
        'maturity-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'control.tested', payload },
      );
    } catch (err) {
      logger.error(`[qiyas-journey-service] Failed to process control.tested`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('risk.mitigated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[qiyas-journey-service] Processing risk.mitigated: Update maturity score after risk mitigation`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.assessment_id as string);
      if (entityId) {
        const existing = await maturityAssessmentService.getById(tenantId, entityId);
        if (existing) {
          await maturityAssessmentService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[qiyas-journey-service] updateMaturityPostMitigation: updated maturity-assessment`, { entityId, tenantId });
        }
      } else {
        const items = await maturityAssessmentService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await maturityAssessmentService.update(tenantId, (item as any).assessment_id, {
            status: 'under-review',
          });
        }
        logger.info(`[qiyas-journey-service] updateMaturityPostMitigation: batch-reviewed maturity-assessment items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateMaturityPostMitigation',
        'maturity-assessment',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.mitigated', payload },
      );
    } catch (err) {
      logger.error(`[qiyas-journey-service] Failed to process risk.mitigated`, { eventId: envelope.eventId, error: err });
    }
  });
}
