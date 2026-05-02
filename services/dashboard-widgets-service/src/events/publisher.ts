import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[dashboard-widgets-service] Event bus not initialized');
  return _bus;
}

export async function publishDomainEvent(
  eventType: string,
  payload: Record<string, unknown>,
  tenantId: string,
  userId?: string,
): Promise<void> {
  await getBus().publish(eventType, payload, { tenantId, userId });
}

export async function publishWidgetCreated(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('widget.created', { entityId, ...data }, { tenantId, userId });
}

export async function publishWidgetUpdated(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('widget.updated', { entityId, ...data }, { tenantId, userId });
}

export async function publishWidgetDataRefreshed(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('widget.data.refreshed', { entityId, ...data }, { tenantId, userId });
}
