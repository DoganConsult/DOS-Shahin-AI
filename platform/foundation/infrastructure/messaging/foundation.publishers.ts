import { logger } from '../../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { FOUNDATION_EVENT_CONTRACT } from './foundation.events';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

// W6.F6.5 — local per-tenant SSE subscriber registry. Each subscription is
// tagged with the caller's tenantId so events from other tenants never leak.
type SseSubscriber = (eventName: string, payload: ModuleEventPayload) => void;
const _sseSubscribers = new Map<string, Set<SseSubscriber>>(); // tenantId -> set

export function subscribeForTenant(tenantId: string, fn: SseSubscriber): () => void {
  let set = _sseSubscribers.get(tenantId);
  if (!set) { set = new Set(); _sseSubscribers.set(tenantId, set); }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) _sseSubscribers.delete(tenantId);
  };
}

export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!FOUNDATION_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${FOUNDATION_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = { ...payload, moduleCode: FOUNDATION_EVENT_CONTRACT.moduleCode };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  // Fan out to local SSE subscribers for the tenant of this event.
  const tenantId = (payload as any)?.tenantId as string | undefined;
  if (tenantId) {
    const set = _sseSubscribers.get(tenantId);
    if (set) for (const fn of set) {
      try { fn(eventName, fullPayload); } catch { /* swallow */ }
    }
  }
  logger.debug(`[${FOUNDATION_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

export function getPublishedEventNames(): string[] {
  return Object.keys(FOUNDATION_EVENT_CONTRACT.published);
}
