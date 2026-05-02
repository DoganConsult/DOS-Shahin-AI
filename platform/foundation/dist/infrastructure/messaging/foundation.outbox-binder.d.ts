export interface EventBusLike {
    publish(eventType: string, payload: unknown, meta?: {
        tenantId?: string;
        userId?: string;
        idempotencyKey?: string;
    }): Promise<string> | Promise<void>;
}
/**
 * Bind the foundation module's publisher to the host service's event bus.
 * Called exactly once at host boot (user-service/server.ts after
 * createEventBackbone/setEventBus). All subsequent calls to publish(eventName,...)
 * inside the foundation module will route through this bus and thus hit the
 * platform outbox + Redis streams.
 */
export declare function bindFoundationPublisher(bus: EventBusLike): void;
