import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus | null {
  return _bus;
}

export async function publishEntityEvent(
  action: 'created' | 'updated' | 'deleted',
  entityType: string,
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  const bus = getBus();
  if (!bus) return;
  try {
    await bus.publish(
      `ai-governance.${entityType}.${action}`,
      { entityId, entityType, ...data },
      { tenantId, userId },
    );
    await bus.publish(
      `ai-governance.entity.${action}`,
      { entityId, entityType, ...data },
      { tenantId, userId },
    );
  } catch {
    // event bus best-effort — does not block API success
  }
}
