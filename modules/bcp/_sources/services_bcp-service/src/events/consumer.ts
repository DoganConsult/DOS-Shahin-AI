import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as bcpPlanService from '../domain/bcp-plan.service';
import { publishBcpPlanCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/bcp.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/bcp/dist/bcp/events/bcp.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[bcp-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[bcp-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[bcp-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[bcp-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[bcp-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[bcp-service] Processing incident.created: Assess BCP readiness when incident created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.plan_id as string);
      if (entityId) {
        const existing = await bcpPlanService.getById(tenantId, entityId);
        if (existing) {
          await bcpPlanService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[bcp-service] assessBcpReadiness: updated bcp-plan`, { entityId, tenantId });
        }
      } else {
        const items = await bcpPlanService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await bcpPlanService.update(tenantId, (item as any).plan_id, {
            status: 'under-review',
          });
        }
        logger.info(`[bcp-service] assessBcpReadiness: batch-reviewed bcp-plan items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'assessBcpReadiness',
        'bcp-plan',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[bcp-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.escalated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[bcp-service] Processing incident.escalated: Activate related BCP plans when incident escalated`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.plan_id as string);
      if (entityId) {
        const existing = await bcpPlanService.getById(tenantId, entityId);
        if (existing) {
          await bcpPlanService.update(tenantId, entityId, {
            status: 'activated',
          });
          logger.info(`[bcp-service] activateRelatedPlans: updated bcp-plan`, { entityId, tenantId });
        }
      } else {
        const items = await bcpPlanService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await bcpPlanService.update(tenantId, (item as any).plan_id, {
            status: 'under-review',
          });
        }
        logger.info(`[bcp-service] activateRelatedPlans: batch-reviewed bcp-plan items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'activateRelatedPlans',
        'bcp-plan',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.escalated', payload },
      );
    } catch (err) {
      logger.error(`[bcp-service] Failed to process incident.escalated`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('risk.mitigated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[bcp-service] Processing risk.mitigated: Review BCP plans after risk mitigation`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.plan_id as string);
      if (entityId) {
        const existing = await bcpPlanService.getById(tenantId, entityId);
        if (existing) {
          await bcpPlanService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[bcp-service] reviewBcpPostMitigation: updated bcp-plan`, { entityId, tenantId });
        }
      } else {
        const items = await bcpPlanService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await bcpPlanService.update(tenantId, (item as any).plan_id, {
            status: 'under-review',
          });
        }
        logger.info(`[bcp-service] reviewBcpPostMitigation: batch-reviewed bcp-plan items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'reviewBcpPostMitigation',
        'bcp-plan',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.mitigated', payload },
      );
    } catch (err) {
      logger.error(`[bcp-service] Failed to process risk.mitigated`, { eventId: envelope.eventId, error: err });
    }
  });
}
