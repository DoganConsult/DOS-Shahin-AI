export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;
export declare function getSubscriptionHandlers(): Map<string, EventHandler>;
export declare function subscribeAll(bus: {
    on(event: string, handler: EventHandler): void;
}): void;
export declare function registerAnalyticsEventSubscribers(): void;
