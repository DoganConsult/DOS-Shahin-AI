import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[integrations-service] Event bus not initialized');
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

export async function publishIntegrationConnected(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('integration.connected', { entityId, ...data }, { tenantId, userId });
}

export async function publishIntegrationSyncCompleted(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('integration.sync.completed', { entityId, ...data }, { tenantId, userId });
}

export async function publishIntegrationSyncFailed(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('integration.sync.failed', { entityId, ...data }, { tenantId, userId });
}

export async function publishIntegrationDisconnected(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('integration.disconnected', { entityId, ...data }, { tenantId, userId });
}
