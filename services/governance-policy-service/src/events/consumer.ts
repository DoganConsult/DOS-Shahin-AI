import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as policyService from '../domain/policy.service';
import { publishPolicyCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/governance.
 * These are the rich domain event subscribers extracted from the monolith.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/governance/dist/governance/events/governance.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[governance-policy-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[governance-policy-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[governance-policy-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[governance-policy-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[governance-policy-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('compliance.gap.identified', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[governance-policy-service] Processing compliance.gap.identified: Flag related policies for review when compliance gap identified`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.policy_id as string);
      if (entityId) {
        const existing = await policyService.getById(tenantId, entityId);
        if (existing) {
          await policyService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[governance-policy-service] flagPolicyForReview: updated policy`, { entityId, tenantId });
        }
      } else {
        const items = await policyService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await policyService.update(tenantId, (item as any).policy_id, {
            status: 'under-review',
          });
        }
        logger.info(`[governance-policy-service] flagPolicyForReview: batch-reviewed policy items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'flagPolicyForReview',
        'policy',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.gap.identified', payload },
      );
    } catch (err) {
      logger.error(`[governance-policy-service] Failed to process compliance.gap.identified`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('audit.finding.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[governance-policy-service] Processing audit.finding.created: Trigger policy review when audit finding created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.policy_id as string);
      if (entityId) {
        const existing = await policyService.getById(tenantId, entityId);
        if (existing) {
          await policyService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[governance-policy-service] triggerPolicyReview: updated policy`, { entityId, tenantId });
        }
      } else {
        const items = await policyService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await policyService.update(tenantId, (item as any).policy_id, {
            status: 'under-review',
          });
        }
        logger.info(`[governance-policy-service] triggerPolicyReview: batch-reviewed policy items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerPolicyReview',
        'policy',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'audit.finding.created', payload },
      );
    } catch (err) {
      logger.error(`[governance-policy-service] Failed to process audit.finding.created`, { eventId: envelope.eventId, error: err });
    }
  });
}
