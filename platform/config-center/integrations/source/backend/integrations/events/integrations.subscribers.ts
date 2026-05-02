import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { INTEGRATIONS_EVENT_CONTRACT } from './integrations.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleConfigUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const configKey = payload.configKey as string || payload.key as string;

  if (configKey?.startsWith('integration.') || configKey?.startsWith('connector.') || configKey?.startsWith('sso.')) {
    await safeQuery(
      `UPDATE "${schema}".connectors
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{config_changed}', 'true'::jsonb),
           updated_at = NOW()
       WHERE status = 'active'`,
      [],
    );

    await createProcessTask(tenantId, {
      title: `Integrations: Admin config updated — verify connector compatibility`,
      description: `Admin configuration key "${configKey}" has been updated. Active connectors should be tested for compatibility.`,
      taskType: 'integration_health_check',
      priority: 'medium',
      entityType: 'admin_config',
      entityId: configKey || 'unknown',
      triggerSource: 'admin.config_updated',
    });
  }
}

async function handleTaskCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const taskId = payload.taskId as string || payload.entityId as string;
  const taskType = payload.taskType as string;

  if (taskType === 'integration_sync' || taskType === 'connector_test') {
    await safeQuery(
      `UPDATE "${schema}".connectors
       SET last_sync_at = NOW(), metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_task_id}', $1::jsonb),
           updated_at = NOW()
       WHERE connector_id = (
         SELECT connector_id FROM "${schema}".connectors
         WHERE metadata->>'pending_task_id' = $2 LIMIT 1
       )`,
      [JSON.stringify(taskId), taskId],
    );
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[integrations] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[integrations] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('admin.config_updated', wrapHandler('handleConfigUpdated', handleConfigUpdated));
handlers.set('workflow.task_completed', wrapHandler('handleTaskCompleted', handleTaskCompleted));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${INTEGRATIONS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerIntegrationsEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `integrations:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[integrations] registered ${handlers.size} domain event subscribers`);
}
