import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as reportScheduleService from '../domain/report-schedule.service';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/analytics.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../modules/analytics/dist/analytics/events/analytics.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[analytics-reporting-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[analytics-reporting-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[analytics-reporting-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[analytics-reporting-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-reporting-service] Processing compliance.assessed: Trigger compliance report generation after assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.schedule_id as string);
      if (entityId) {
        const existing = await reportScheduleService.getById(tenantId, entityId);
        if (existing) {
          await reportScheduleService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[analytics-reporting-service] triggerComplianceReports: updated report-schedule`, { entityId, tenantId });
        }
      } else {
        const items = await reportScheduleService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await reportScheduleService.update(tenantId, (item as any).schedule_id, {
            status: 'under-review',
          });
        }
        logger.info(`[analytics-reporting-service] triggerComplianceReports: batch-reviewed report-schedule items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerComplianceReports',
        'report-schedule',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[analytics-reporting-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('risk.updated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-reporting-service] Processing risk.updated: Trigger risk report generation on risk update`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.schedule_id as string);
      if (entityId) {
        const existing = await reportScheduleService.getById(tenantId, entityId);
        if (existing) {
          await reportScheduleService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[analytics-reporting-service] triggerRiskReports: updated report-schedule`, { entityId, tenantId });
        }
      } else {
        const items = await reportScheduleService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await reportScheduleService.update(tenantId, (item as any).schedule_id, {
            status: 'under-review',
          });
        }
        logger.info(`[analytics-reporting-service] triggerRiskReports: batch-reviewed report-schedule items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerRiskReports',
        'report-schedule',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.updated', payload },
      );
    } catch (err) {
      logger.error(`[analytics-reporting-service] Failed to process risk.updated`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('audit.finding.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-reporting-service] Processing audit.finding.created: Trigger audit report generation on finding`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.schedule_id as string);
      if (entityId) {
        const existing = await reportScheduleService.getById(tenantId, entityId);
        if (existing) {
          await reportScheduleService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[analytics-reporting-service] triggerAuditReports: updated report-schedule`, { entityId, tenantId });
        }
      } else {
        const items = await reportScheduleService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await reportScheduleService.update(tenantId, (item as any).schedule_id, {
            status: 'under-review',
          });
        }
        logger.info(`[analytics-reporting-service] triggerAuditReports: batch-reviewed report-schedule items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerAuditReports',
        'report-schedule',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'audit.finding.created', payload },
      );
    } catch (err) {
      logger.error(`[analytics-reporting-service] Failed to process audit.finding.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.resolved', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-reporting-service] Processing incident.resolved: Trigger incident report after resolution`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.schedule_id as string);
      if (entityId) {
        const existing = await reportScheduleService.getById(tenantId, entityId);
        if (existing) {
          await reportScheduleService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[analytics-reporting-service] triggerIncidentReports: updated report-schedule`, { entityId, tenantId });
        }
      } else {
        const items = await reportScheduleService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await reportScheduleService.update(tenantId, (item as any).schedule_id, {
            status: 'under-review',
          });
        }
        logger.info(`[analytics-reporting-service] triggerIncidentReports: batch-reviewed report-schedule items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'triggerIncidentReports',
        'report-schedule',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.resolved', payload },
      );
    } catch (err) {
      logger.error(`[analytics-reporting-service] Failed to process incident.resolved`, { eventId: envelope.eventId, error: err });
    }
  });
}
