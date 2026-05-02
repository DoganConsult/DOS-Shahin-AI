import { getEventBus, publishEvent } from '@dos/module-sdk';
export type { PlatformEvent, EventBus } from '@dos/module-sdk';
export declare const eventBus: {
    publish: (event: import("@dos/module-sdk").PlatformEvent) => Promise<string | void>;
    subscribe: (eventType: string, subscriberId: string, handler: import("@dos/module-sdk").EventHandler) => void;
    onAfterPublish: (...args: unknown[]) => any;
};
export declare const emitEvent: typeof publishEvent;
