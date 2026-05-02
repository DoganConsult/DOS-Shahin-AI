import { getEventBus, publishEvent } from '@dos/module-sdk';
export type { PlatformEvent, EventBus } from '@dos/module-sdk';

export const eventBus = {
  publish: (...args: Parameters<ReturnType<typeof getEventBus>['publish']>) => getEventBus().publish(...args),
  subscribe: (...args: Parameters<ReturnType<typeof getEventBus>['subscribe']>) => getEventBus().subscribe(...args),
  onAfterPublish: (...args: unknown[]) => {

    const bus = getEventBus() as Record<string, unknown>;
    if (typeof bus.onAfterPublish === 'function') return (bus.onAfterPublish as Function)(...args);
  },
};

export const emitEvent = publishEvent;
