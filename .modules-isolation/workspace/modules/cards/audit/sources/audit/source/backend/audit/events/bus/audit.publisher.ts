import { RedisStreamEventBus } from '@dos/platform-core/events';

let _bus: RedisStreamEventBus | null = null;

export function setAuditBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[audit-service] Event bus not initialized');
  return _bus;
}

export async function publishAuditEntryCreated(
  tenantId: string,
  auditId: string,
  action: string,
  userId?: string,
): Promise<void> {
  await getBus().publish('audit.entry.created', { auditId, action, userId }, { tenantId, userId });
}
