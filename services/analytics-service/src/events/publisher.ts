import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[analytics-service] Event bus not initialized');
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

export async function publishAnalyticsDashboardCreated(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('analytics.dashboard.created', { entityId, ...data }, { tenantId, userId });
}

export async function publishAnalyticsKpiThresholdBreached(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('analytics.kpi.threshold.breached', { entityId, ...data }, { tenantId, userId });
}
