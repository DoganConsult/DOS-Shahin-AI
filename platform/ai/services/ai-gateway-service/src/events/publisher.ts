import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[ai-gateway-service] Event bus not initialized');
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

export const DOMAIN_EVENTS = [
  'ai.created',
  'ai.updated',
  'ai.deleted',
  'ai-governance.created',
  'ai-governance.updated',
  'ai-governance.deleted',
  'agrc-engine.created',
  'agrc-engine.updated',
  'agrc-engine.deleted',
  'mcp.created',
  'mcp.updated',
  'mcp.deleted',
] as const;
