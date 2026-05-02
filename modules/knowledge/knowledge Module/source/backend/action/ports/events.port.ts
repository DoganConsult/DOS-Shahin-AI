import { getEventBus, publishEvent } from '@dos/module-sdk';
export type { PlatformEvent, EventBus } from '@dos/module-sdk';
export const eventBus = {
  publish: (...args: Parameters<ReturnType<typeof getEventBus>['publish']>) => getEventBus().publish(...args),
  subscribe: (...args: Parameters<ReturnType<typeof getEventBus>['subscribe']>) => getEventBus().subscribe(...args),
};
export const emitEvent = publishEvent;
