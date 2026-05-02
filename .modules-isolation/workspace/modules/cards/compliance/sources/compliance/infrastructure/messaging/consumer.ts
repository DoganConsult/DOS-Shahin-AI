import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as complianceService from '../../domain/compliance.service';
import * as controlService from '../../domain/control.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/compliance.
 * These are the rich domain event subscribers extracted from the monolith.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/compliance/dist/compliance/events/compliance.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[compliance-controls-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[compliance-controls-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[compliance-controls-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[compliance-controls-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[compliance-controls-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('audit.finding.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[compliance-controls-service] Processing audit.finding.created: Reassess control effectiveness when audit finding created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.control_id as string);
      if (entityId) {
        const existing = await controlService.getById(tenantId, entityId);
        if (existing) {
          await controlService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[compliance-controls-service] reassessControlFromFinding: updated control`, { entityId, tenantId });
        }
      } else {
        const items = await controlService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await controlService.update(tenantId, (item as any).control_id, {
            status: 'under-review',
          });
        }
        logger.info(`[compliance-controls-service] reassessControlFromFinding: batch-reviewed control items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'reassessControlFromFinding',
        'control',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'audit.finding.created', payload },
      );
    } catch (err) {
      logger.error(`[compliance-controls-service] Failed to process audit.finding.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('risk.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[compliance-controls-service] Processing risk.created: Reassess compliance status when new risk identified`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.requirement_id as string);
      if (entityId) {
        const existing = await complianceService.getById(tenantId, entityId);
        if (existing) {
          await complianceService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[compliance-controls-service] reassessComplianceFromRisk: updated compliance`, { entityId, tenantId });
        }
      } else {
        const items = await complianceService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await complianceService.update(tenantId, (item as any).requirement_id, {
            status: 'under-review',
          });
        }
        logger.info(`[compliance-controls-service] reassessComplianceFromRisk: batch-reviewed compliance items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'reassessComplianceFromRisk',
        'compliance',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.created', payload },
      );
    } catch (err) {
      logger.error(`[compliance-controls-service] Failed to process risk.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('evidence.submitted', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[compliance-controls-service] Processing evidence.submitted: Update compliance evidence status when evidence submitted`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.requirement_id as string);
      if (entityId) {
        const existing = await complianceService.getById(tenantId, entityId);
        if (existing) {
          await complianceService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[compliance-controls-service] updateComplianceEvidence: updated compliance`, { entityId, tenantId });
        }
      } else {
        const items = await complianceService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await complianceService.update(tenantId, (item as any).requirement_id, {
            status: 'under-review',
          });
        }
        logger.info(`[compliance-controls-service] updateComplianceEvidence: batch-reviewed compliance items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateComplianceEvidence',
        'compliance',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'evidence.submitted', payload },
      );
    } catch (err) {
      logger.error(`[compliance-controls-service] Failed to process evidence.submitted`, { eventId: envelope.eventId, error: err });
    }
  });
}
