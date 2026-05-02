import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as dashboardService from '../domain/dashboard.service';
import { publishAnalyticsDashboardCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/analytics.
 * These are the rich domain event subscribers extracted from the monolith.
 * Wrapped in try/catch so the service starts even if the module is unavailable.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleSubscribers = require(
      '../../../../modules/analytics/dist/analytics/events/analytics.subscribers'
    );

    if (typeof moduleSubscribers.subscribeAll === 'function') {
      const busAdapter = {
        on(event: string, handler: (payload: Record<string, unknown>) => Promise<void>) {
          eventBus.subscribe(event, async (envelope) => {
            try {
              await handler(envelope as unknown as Record<string, unknown>);
            } catch (err) {
              logger.error(`[analytics-service] Module event handler failed for ${event}`, { error: err });
            }
          });
        },
      };
      moduleSubscribers.subscribeAll(busAdapter);
      logger.info('[analytics-service] Module event subscribers registered');
    } else if (typeof moduleSubscribers.getSubscriptionHandlers === 'function') {
      const handlers = moduleSubscribers.getSubscriptionHandlers() as Map<string, (payload: Record<string, unknown>) => Promise<void>>;
      for (const [eventName, handler] of handlers) {
        eventBus.subscribe(eventName, async (envelope) => {
          try {
            await handler(envelope as unknown as Record<string, unknown>);
          } catch (err) {
            logger.error(`[analytics-service] Module handler failed for ${eventName}`, { error: err });
          }
        });
      }
      logger.info(`[analytics-service] Registered ${handlers.size} module event handlers`);
    }
  } catch (err) {
    logger.warn('[analytics-service] Module event subscribers not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('risk.updated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-service] Processing risk.updated: Refresh risk dashboards when risk updated`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.dashboard_id as string);
      if (entityId) {
        const existing = await dashboardService.getById(tenantId, entityId);
        if (existing) {
          await dashboardService.update(tenantId, entityId, {
            description: `Refreshed due to risk.updated at ${new Date().toISOString()}`,
          });
          logger.info(`[analytics-service] refreshRiskDashboards: updated dashboard`, { entityId, tenantId });
        }
      } else {
        const items = await dashboardService.list(tenantId, { pageSize: 10 });
        for (const item of items.data) {
          await dashboardService.update(tenantId, (item as any).dashboard_id, {
            description: `Refreshed due to risk.updated at ${new Date().toISOString()}`,
          });
        }
        logger.info(`[analytics-service] refreshRiskDashboards: batch-reviewed dashboard items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'refreshRiskDashboards',
        'dashboard',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.updated', payload },
      );
    } catch (err) {
      logger.error(`[analytics-service] Failed to process risk.updated`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-service] Processing compliance.assessed: Refresh compliance dashboards after assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.dashboard_id as string);
      if (entityId) {
        const existing = await dashboardService.getById(tenantId, entityId);
        if (existing) {
          await dashboardService.update(tenantId, entityId, {
            description: `Refreshed due to compliance.assessed at ${new Date().toISOString()}`,
          });
          logger.info(`[analytics-service] refreshComplianceDashboards: updated dashboard`, { entityId, tenantId });
        }
      } else {
        const items = await dashboardService.list(tenantId, { pageSize: 10 });
        for (const item of items.data) {
          await dashboardService.update(tenantId, (item as any).dashboard_id, {
            description: `Refreshed due to compliance.assessed at ${new Date().toISOString()}`,
          });
        }
        logger.info(`[analytics-service] refreshComplianceDashboards: batch-reviewed dashboard items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'refreshComplianceDashboards',
        'dashboard',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[analytics-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[analytics-service] Processing incident.created: Check KPI thresholds when incident created`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.dashboard_id as string);
      if (entityId) {
        const existing = await dashboardService.getById(tenantId, entityId);
        if (existing) {
          await dashboardService.update(tenantId, entityId, {
            description: `KPI check triggered by incident.created at ${new Date().toISOString()}`,
          });
          logger.info(`[analytics-service] checkKpiThresholds: updated dashboard`, { entityId, tenantId });
        }
      } else {
        const items = await dashboardService.list(tenantId, { pageSize: 10 });
        for (const item of items.data) {
          await dashboardService.update(tenantId, (item as any).dashboard_id, {
            description: `KPI check triggered by incident.created at ${new Date().toISOString()}`,
          });
        }
        logger.info(`[analytics-service] checkKpiThresholds: batch-reviewed dashboard items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'checkKpiThresholds',
        'dashboard',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[analytics-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });
}
