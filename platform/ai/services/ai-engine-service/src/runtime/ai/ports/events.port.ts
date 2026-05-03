import { getEventBus, publishEvent } from '@dos/module-sdk';
export type { PlatformEvent, EventBus } from '@dos/module-sdk';

export const eventBus = {
  publish: (...args: Parameters<ReturnType<typeof getEventBus>['publish']>) => getEventBus().publish(...args),
  subscribe: (...args: Parameters<ReturnType<typeof getEventBus>['subscribe']>) => getEventBus().subscribe(...args),
  onAfterPublish: (...args: unknown[]) => {

    const bus = getEventBus() as unknown as Record<string, unknown>;
    if (typeof bus.onAfterPublish === 'function') return (bus.onAfterPublish as Function)(...args);
  },
  getBackpressureStats: (): {
    inFlight: number;
    maxInFlight: number;
    dropped: number;
    tenantsActive: number;
  } => {
    const bus = getEventBus();
    const fn = bus.getBackpressureStats;
    if (typeof fn === 'function') return fn.call(bus);
    return { inFlight: 0, maxInFlight: 0, dropped: 0, tenantsActive: 0 };
  },
};

export const emitEvent = publishEvent;
