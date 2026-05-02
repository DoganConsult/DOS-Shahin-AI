import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[compliance-controls-service] Event bus not initialized');
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

export async function publishComplianceAssessed(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('compliance.assessed', { entityId, ...data }, { tenantId, userId });
}

export async function publishComplianceGapIdentified(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('compliance.gap.identified', { entityId, ...data }, { tenantId, userId });
}

export async function publishControlTested(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('control.tested', { entityId, ...data }, { tenantId, userId });
}

export async function publishControlEffectivenessChanged(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('control.effectiveness.changed', { entityId, ...data }, { tenantId, userId });
}
