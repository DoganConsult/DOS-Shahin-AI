// @ts-nocheck — module-layer imports not yet extracted
import { Worker, Job } from 'bullmq';
import { logger } from '@dos/platform-core/observability';
import { eventBus } from '@dos/platform-core/events';
import { recordSLABreach, recordSLAWarning, recordEscalation } from '../action-hub';

export function startActionSlaWorker() {
  const worker = new Worker('agrc-action-slas', async (job: Job) => {
    const { actionId, tenantId, priority } = job.data;

    if (job.name === 'sla-breach-check') {
      logger.error(`[Action-Hub] SLA BREACH: Action ${actionId} exceeded time limit.`);

      await recordSLABreach(tenantId, actionId);
      await recordEscalation(tenantId, actionId, 1, ['module_owner', 'team_lead'], 'breach', 'Automatic breach escalation');

      await eventBus.publish({
        eventType: 'action.escalated',
        tenantId,
        severity: 'critical',
        entityType: 'action_item',
        entityId: actionId,
        payload: {
          actionId,
          escalationReason: 'sla_breached',
          priority,
          escalationLevel: 1,
        },
      });

    } else if (job.name === 'sla-warning') {
      logger.warn(`[Action-Hub] SLA Warning: Action ${actionId} approaching breach.`);

      await recordSLAWarning(tenantId, actionId);

      await eventBus.publish({
        eventType: 'action.overdue',
        tenantId,
        severity: 'warning',
        entityType: 'action_item',
        entityId: actionId,
        payload: {
          actionId,
          escalationReason: 'sla_warning',
          priority,
        },
      });

    } else if (job.name === 'sla-escalation') {
      const { escalationLevel, notifyRoles } = job.data;
      logger.warn(`[Action-Hub] Escalation L${escalationLevel} triggered for action ${actionId}.`);

      await recordEscalation(tenantId, actionId, escalationLevel, notifyRoles, 'scheduled', `Scheduled L${escalationLevel} escalation`);

      await eventBus.publish({
        eventType: 'action.escalated',
        tenantId,
        severity: escalationLevel >= 3 ? 'critical' : 'warning',
        entityType: 'action_item',
        entityId: actionId,
        payload: {
          actionId,
          escalationReason: 'scheduled_escalation',
          escalationLevel,
          notifyRoles,
          priority,
        },
      });
    }

  }, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Action-Hub] SLA Worker failed for job ${job?.id}`, err);
  });

  worker.on('completed', (job) => {
    logger.debug(`[Action-Hub] SLA job completed: ${job.name} ${job.id}`);
  });

  logger.info(`[Action-Hub] BullMQ SLA Worker initialized.`);
  return worker;
}
