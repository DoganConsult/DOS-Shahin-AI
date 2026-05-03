import type { PlatformEvent, EventRegistration, EventSubscription } from '@dos/types';

export type EventHandler = (event: PlatformEvent) => Promise<void>;

export interface EventBus {
  publish(event: PlatformEvent): Promise<void | string>;
  subscribe(eventType: string, subscriberId: string, handler: EventHandler): void;
  /** Optional — DOSEventBus handles unsubscription via EventEmitter internally */
  unsubscribe?(eventType: string, subscriberId: string): void;
  /** Optional — DOSEventBus validates events via schema validator, not type registration */
  registerEventType?(registration: EventRegistration): void;
  /** Optional — concrete bus implementations may expose runtime backpressure metrics */
  getBackpressureStats?(): {
    inFlight: number;
    maxInFlight: number;
    dropped: number;
    tenantsActive: number;
  };
}

const GLOBAL_EVENT_KEY = Symbol.for('__dos_sdk_event_bus__');

export function setEventBus(bus: EventBus): void {
  (globalThis as any)[GLOBAL_EVENT_KEY] = bus;
}

export function getEventBus(): EventBus {
  const bus = (globalThis as any)[GLOBAL_EVENT_KEY] as EventBus | undefined;
  if (!bus) {
    throw new Error('[DOS-SDK] EventBus not initialized. Call setEventBus() during platform startup.');
  }
  return bus;
}

export function publishEvent(event: PlatformEvent): Promise<void | string> {
  return getEventBus().publish(event);
}

export function subscribeEvent(eventType: string, subscriberId: string, handler: EventHandler): void {
  getEventBus().subscribe(eventType, subscriberId, handler);
}

export type { PlatformEvent, EventRegistration, EventSubscription };
