// Backend-level events port barrel — used by services that live at
// modules/<mod>/source/backend/<sub>/... importing via `../../ports/events.port`.
import { getEventBus, publishEvent } from '@dos/module-sdk';
import type { PlatformEvent as DosPlatformEvent, EventBus as DosEventBus } from '@dos/module-sdk';

export interface PlatformEvent extends DosPlatformEvent {
  sourceService?: string;
}

export type EventBus = DosEventBus;

export const eventBus = {
  publish: (event: PlatformEvent) => getEventBus().publish(event as DosPlatformEvent),
  subscribe: (...args: Parameters<ReturnType<typeof getEventBus>['subscribe']>) => getEventBus().subscribe(...args),
  onAfterPublish: (...args: unknown[]) => {
    const bus = getEventBus() as unknown as Record<string, unknown>;
    if (typeof bus.onAfterPublish === 'function') {
      return (bus.onAfterPublish as (...innerArgs: unknown[]) => unknown)(...args);
    }
    return undefined;
  },
};

export function pushToTenant(tenantId: string, payload: Record<string, unknown>): Promise<void | string> {
  return eventBus.publish({
    eventType: 'tenant.push',
    tenantId,
    entityType: 'tenant',
    entityId: tenantId,
    payload,
    sourceService: 'analytics',
  });
}

export const emitEvent = (event: PlatformEvent) => publishEvent(event as DosPlatformEvent);
