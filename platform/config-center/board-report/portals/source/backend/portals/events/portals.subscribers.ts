import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { PORTALS_EVENT_CONTRACT } from './portals.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleVendorPortalTokenIssued(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const vendorId = payload.vendorId as string || payload.entityId as string;
  const portalId = payload.portalId as string;

  if (portalId) {
    await safeQuery(
      `UPDATE "${schema}".portals
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_vendor_token_vendor_id}', $1::jsonb),
           updated_at = NOW()
       WHERE portal_id = $2`,
      [JSON.stringify(vendorId), portalId],
    );
  } else {
    await createProcessTask(tenantId, {
      title: `Portals: Vendor portal token issued — verify portal configuration`,
      description: `A vendor portal token has been issued for vendor ${vendorId}. Ensure portal access is properly configured.`,
      taskType: 'portal_review',
      priority: 'medium',
      entityType: 'vendor',
      entityId: vendorId,
      triggerSource: 'vendor.portal_token_issued',
    });
  }
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('portal') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".portals SET status = $1, updated_at = NOW() WHERE portal_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[portals] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[portals] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('vendor.portal_token_issued', wrapHandler('handleVendorPortalTokenIssued', handleVendorPortalTokenIssued));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${PORTALS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerPortalsEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `portals:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[portals] registered ${handlers.size} domain event subscribers`);
}
