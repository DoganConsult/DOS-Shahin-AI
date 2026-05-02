import type { PlatformEvent, EventRegistration, EventSubscription } from '@dos/types';
export type EventHandler = (event: PlatformEvent) => Promise<void>;
export interface EventBus {
    publish(event: PlatformEvent): Promise<void | string>;
    subscribe(eventType: string, subscriberId: string, handler: EventHandler): void;
    /** Optional — DOSEventBus handles unsubscription via EventEmitter internally */
    unsubscribe?(eventType: string, subscriberId: string): void;
    /** Optional — DOSEventBus validates events via schema validator, not type registration */
    registerEventType?(registration: EventRegistration): void;
}
export declare function setEventBus(bus: EventBus): void;
export declare function getEventBus(): EventBus;
export declare function publishEvent(event: PlatformEvent): Promise<void | string>;
export declare function subscribeEvent(eventType: string, subscriberId: string, handler: EventHandler): void;
export type { PlatformEvent, EventRegistration, EventSubscription };
