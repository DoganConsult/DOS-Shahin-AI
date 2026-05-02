import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setNotificationBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[notification-service] Event bus not initialized');
  return _bus;
}

export async function publishNotificationCreated(
  tenantId: string,
  notificationId: string,
  userId: string,
  meta?: { title?: string; body?: string; type?: string; module?: string; entityType?: string; entityId?: string },
): Promise<void> {
  await getBus().publish('notification.created', { notificationId, userId, ...meta }, { tenantId, userId });
}

export async function publishNotificationSent(
  tenantId: string,
  notificationId: string,
  userId: string,
  channel: string,
): Promise<void> {
  await getBus().publish('notification.sent', { notificationId, userId, channel }, { tenantId });
}

export async function publishNotificationRead(
  tenantId: string,
  notificationId: string,
  userId: string,
): Promise<void> {
  await getBus().publish('notification.read', { notificationId, userId }, { tenantId });
}
