import { RedisStreamEventBus } from './redis-stream-bus';
import type { EventHandler } from './types';
export interface EventBusPublishArg {
    eventType: string;
    tenantId?: string;
    userId?: string;
    sourceService?: string;
    severity?: 'info' | 'warning' | 'critical';
    payload?: unknown;
    idempotencyKey?: string;
    /** Domain-entity fields — promoted into the flattened envelope payload. */
    entityType?: string;
    entityId?: string;
    action?: string;
    triggeredBy?: string;
    correlationId?: string;
    workflowType?: string;
    previousState?: string;
    newState?: string;
    /** Additional opaque metadata the consumer can attach; merged into payload. */
    data?: Record<string, unknown>;
}
export interface EmitEventArg {
    tenantId: string;
    userId?: string;
    module: string;
    event: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, unknown>;
    correlationId?: string;
}
export interface RegisterEventTypeArg {
    eventType: string;
    category?: string;
    ownerModule?: string;
    description?: string;
    schemaVersion?: number;
    payloadSchema?: unknown;
}
/**
 * Attach a real broker-backed bus (typically `RedisStreamEventBus`). Call
 * from each service's boot path once Redis is reachable. Idempotent: the
 * last bus wins.
 */
export declare function initEventBackbone(bus: RedisStreamEventBus): void;
/** Swap back to in-memory — used by tests that need a clean bus. */
export declare function resetEventBackboneForTesting(): void;
/** Inspect the registry that `registerEventType` writes to. */
export declare function listRegisteredEventTypes(): ReadonlyMap<string, RegisterEventTypeArg>;
/** Optional extra context some callers attach when publishing. */
export interface PublishMeta {
    userId?: string;
    moduleCode?: string;
    entityType?: string;
    entityId?: string;
    category?: string;
    idempotencyKey?: string;
    correlationId?: string;
    [key: string]: unknown;
}
/**
 * Legacy positional form: `publish(eventType, tenantId, payload, meta?)`.
 * Used by foundation/agents, tenant-service, workflow-service lifecycle bridge,
 * ai-governance-service, etc. The tenantId is promoted into the envelope meta;
 * optional `meta` is merged into the payload so downstream consumers can
 * read `userId` / `moduleCode` / `entityType` / `entityId` / `category`.
 */
export declare function publish(eventType: string, tenantId: string, payload: unknown, meta?: PublishMeta): Promise<string>;
/**
 * High-level module-event shape. Consumers pass the full
 * `{ tenantId, userId, module, event, entityType, entityId, data }`
 * shape — we flatten it into `{ eventType: event, payload: <rest> }`.
 */
export declare function emitEvent(arg: EmitEventArg): Promise<string>;
/** Subscribe to an event stream. Handlers receive real envelopes. */
export declare function subscribe(eventType: string, handler: EventHandler): void;
/**
 * Declare an event type so observability/catalog tooling can introspect it.
 * This is metadata-only today; a downstream registry service can persist
 * the accumulated registry via `listRegisteredEventTypes()` on boot.
 */
export declare function registerEventType(arg: RegisterEventTypeArg): void;
/**
 * `eventBus.publish({ eventType, tenantId, sourceService, severity, payload })`
 * is the object-form used by the workflow engine and the tenant-service
 * handoff queue. It delegates to the same underlying bus so publishers and
 * subscribers see each other regardless of which shape was used.
 */
export declare const eventBus: {
    publish(arg: EventBusPublishArg): Promise<string>;
    subscribe(eventType: string, handler: EventHandler): void;
};
//# sourceMappingURL=singleton.d.ts.map