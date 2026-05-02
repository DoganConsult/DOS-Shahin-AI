import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { ServiceClient } from '@dos/service-client';
import { recordAudit } from '../adapters/audit.adapter';
import { sendNotification } from '../adapters/notification.adapter';
import * as briefingService from '../domain/briefing.service';
import { publishExecutiveBriefingCreated } from './publisher';

const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});

/**
 * Wave 2C: Register module-level event handlers from modules/executive.
 * The executive module uses event definitions but no subscribeAll — register directly.
 */
export function registerModuleConsumers(eventBus: RedisStreamEventBus): void {
  try {
    const moduleEvents = require(
      '../../../modules/executive/dist/executive/events/executive.events'
    );
    if (moduleEvents) {
      logger.info('[executive-intelligence-service] Module event definitions loaded');
    }
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module event definitions not available, skipping', { error: err });
  }
}

export function registerConsumers(eventBus: RedisStreamEventBus): void {
  eventBus.subscribe('risk.updated', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[executive-intelligence-service] Processing risk.updated: Update briefing risk posture on risk change`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.briefing_id as string);
      if (entityId) {
        const existing = await briefingService.getById(tenantId, entityId);
        if (existing) {
          await briefingService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[executive-intelligence-service] updateBriefingRiskPosture: updated briefing`, { entityId, tenantId });
        }
      } else {
        const items = await briefingService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await briefingService.update(tenantId, (item as any).briefing_id, {
            status: 'under-review',
          });
        }
        logger.info(`[executive-intelligence-service] updateBriefingRiskPosture: batch-reviewed briefing items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateBriefingRiskPosture',
        'briefing',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'risk.updated', payload },
      );
    } catch (err) {
      logger.error(`[executive-intelligence-service] Failed to process risk.updated`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('compliance.assessed', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[executive-intelligence-service] Processing compliance.assessed: Update briefing compliance score after assessment`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const entityId = (payload.entityId as string) || (payload.briefing_id as string);
      if (entityId) {
        const existing = await briefingService.getById(tenantId, entityId);
        if (existing) {
          await briefingService.update(tenantId, entityId, {
            status: 'under-review',
          });
          logger.info(`[executive-intelligence-service] updateBriefingCompliance: updated briefing`, { entityId, tenantId });
        }
      } else {
        const items = await briefingService.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await briefingService.update(tenantId, (item as any).briefing_id, {
            status: 'under-review',
          });
        }
        logger.info(`[executive-intelligence-service] updateBriefingCompliance: batch-reviewed briefing items`, { count: items.data.length, tenantId });
      }

      await recordAudit(
        tenantId,
        'updateBriefingCompliance',
        'briefing',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'compliance.assessed', payload },
      );
    } catch (err) {
      logger.error(`[executive-intelligence-service] Failed to process compliance.assessed`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('incident.created', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[executive-intelligence-service] Processing incident.created: Create executive alert for critical incidents`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await briefingService.create(tenantId, {
          title: (payload.title as string) || `Auto: incident.created - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          status: 'open',
          summary: `Auto-generated from incident.created event (ID: ${envelope.eventId})`,
        });
        logger.info(`[executive-intelligence-service] Auto-created briefing`, { id: created.briefing_id, tenantId });
        await publishExecutiveBriefingCreated(tenantId, created.briefing_id, { source: 'incident.created', autoGenerated: true }, envelope.userId);
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'Briefing Created', `A new briefing was auto-created from incident.created`, 'info', { entityId: created.briefing_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createExecutiveAlert',
        'briefing',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'incident.created', payload },
      );
    } catch (err) {
      logger.error(`[executive-intelligence-service] Failed to process incident.created`, { eventId: envelope.eventId, error: err });
    }
  });

  eventBus.subscribe('analytics.kpi.threshold.breached', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(`[executive-intelligence-service] Processing analytics.kpi.threshold.breached: Create executive alert on KPI threshold breach`, {
        eventId: envelope.eventId,
        tenantId,
      });

      const created = await briefingService.create(tenantId, {
          title: (payload.title as string) || `Auto: analytics.kpi.threshold.breached - ${envelope.eventId.slice(0, 8)}`,
          type: (payload.type as string) || (payload.category as string) || 'auto-generated',
          status: 'open',
          summary: `Auto-generated from analytics.kpi.threshold.breached event (ID: ${envelope.eventId})`,
        });
        logger.info(`[executive-intelligence-service] Auto-created briefing`, { id: created.briefing_id, tenantId });
        await publishExecutiveBriefingCreated(tenantId, created.briefing_id, { source: 'analytics.kpi.threshold.breached', autoGenerated: true }, envelope.userId);
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, 'Briefing Created', `A new briefing was auto-created from analytics.kpi.threshold.breached`, 'info', { entityId: created.briefing_id }).catch(() => {});
        }

      await recordAudit(
        tenantId,
        'createKpiAlert',
        'briefing',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: 'analytics.kpi.threshold.breached', payload },
      );
    } catch (err) {
      logger.error(`[executive-intelligence-service] Failed to process analytics.kpi.threshold.breached`, { eventId: envelope.eventId, error: err });
    }
  });
}
