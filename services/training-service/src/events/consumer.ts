import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as trainingProgramService from '../domain/training-program.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/training.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/training/dist/backend/training/events/training.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[training-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[training-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[training-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[training-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[training-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('user.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[training-service] Processing user.created: Assign mandatory training to new users`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await trainingProgramService.create(tenantId, {
          title: (payload.title as string) || `Auto: user.created - ${envelope.eventId.slice(0, 8)}`,
          category: (payload.category as string) || (payload.category as string) || 'auto-generated',
          status: 'open',
          description: `Auto-generated from user.created event (ID: ${envelope.eventId})`,
        });
        logger.info(`[training-service] Auto-created training-program`, { id: created.program_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'TrainingProgram Created', `A new training-program was auto-created from user.created`, 'info', { entityId: created.program_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'assignMandatoryTraining',
        'training-program',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'user.created', payload },
      );
    } catch (err) {
      logger.error(`[training-service] Failed to process user.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('compliance.gap.identified', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[training-service] Processing compliance.gap.identified: Assign remediation training when compliance gap identified`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await trainingProgramService.create(tenantId, {
          title: (payload.title as string) || `Auto: compliance.gap.identified - ${envelope.eventId.slice(0, 8)}`,
          category: (payload.category as string) || (payload.category as string) || 'auto-generated',
          status: 'open',
          description: `Auto-generated from compliance.gap.identified event (ID: ${envelope.eventId})`,
        });
        logger.info(`[training-service] Auto-created training-program`, { id: created.program_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'TrainingProgram Created', `A new training-program was auto-created from compliance.gap.identified`, 'info', { entityId: created.program_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'assignRemediationTraining',
        'training-program',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.gap.identified', payload },
      );
    } catch (err) {
      logger.error(`[training-service] Failed to process compliance.gap.identified`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('policy.published', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[training-service] Processing policy.published: Assign policy training when new policy published`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await trainingProgramService.create(tenantId, {
          title: (payload.title as string) || `Auto: policy.published - ${envelope.eventId.slice(0, 8)}`,
          category: (payload.category as string) || (payload.category as string) || 'auto-generated',
          status: 'open',
          description: `Auto-generated from policy.published event (ID: ${envelope.eventId})`,
        });
        logger.info(`[training-service] Auto-created training-program`, { id: created.program_id, tenantId });
        
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'TrainingProgram Created', `A new training-program was auto-created from policy.published`, 'info', { entityId: created.program_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'assignPolicyTraining',
        'training-program',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'policy.published', payload },
      );
    } catch (err) {
      logger.error(`[training-service] Failed to process policy.published`, { eventId: envelope.eventId, error: err });
    }
  });
}
