import type { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus | null {
  return _bus;
}

/**
 * Publish a domain event onto the Redis-stream-backed outbox. Sales Room
 * events are platform-scoped, so tenantId is allowed to be null —
 * downstream consumers (notifications, analytics, A14) handle that.
 */
export async function publishDomainEvent(
  eventType: string,
  payload: Record<string, unknown>,
  opts: { tenantId?: string | null; userId?: string } = {},
): Promise<void> {
  const bus = getBus();
  if (!bus) return; // soft-fail before bus is wired (e.g. unit tests)
  // RedisStreamEventBus.publish requires tenantId; fall back to a
  // platform-marker for cross-tenant marketing events.
  const tenantId = opts.tenantId || '__platform__';
  await bus.publish(eventType, payload, { tenantId, userId: opts.userId });
}

// ── Concrete event helpers (one per canonical event in service.manifest.json) ──

export const publishAssetCreated = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.created', { entityId, ...data }, { userId });

export const publishAssetUpdated = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.updated', { entityId, ...data }, { userId });

export const publishAssetUploaded = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.uploaded', { entityId, ...data }, { userId });

export const publishAssetDeactivated = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.deactivated', { entityId, ...data }, { userId });

export const publishPreviewTokenIssued = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.preview_token_issued', { entityId, ...data }, { userId });

export const publishDownloadTokenIssued = (entityId: string, data: Record<string, unknown>, userId?: string) =>
  publishDomainEvent('sales_room.asset.download_token_issued', { entityId, ...data }, { userId });
