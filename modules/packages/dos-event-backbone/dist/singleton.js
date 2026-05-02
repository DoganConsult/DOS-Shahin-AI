"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
exports.initEventBackbone = initEventBackbone;
exports.resetEventBackboneForTesting = resetEventBackboneForTesting;
exports.listRegisteredEventTypes = listRegisteredEventTypes;
exports.publish = publish;
exports.emitEvent = emitEvent;
exports.subscribe = subscribe;
exports.registerEventType = registerEventType;
/**
 * Canonical event-backbone public contract.
 *
 * This file exists because the historical contract that consumers rely on
 * (`eventBus`, free-function `publish`, `emitEvent`, `subscribe`,
 * `registerEventType`) was never exported from `@dos/event-backbone`, even
 * though ~40+ call sites in services/ and modules/ import it. Those call
 * sites compile today only because several service tsconfigs exclude the
 * directories that contain them.
 *
 * This module provides a single real implementation behind a backward-
 * compatible facade. In production a service calls `initEventBackbone()`
 * from its boot path to attach a live `RedisStreamEventBus`. Outside of
 * that (tests, early boot, local dev without Redis), the facade falls
 * through to an in-memory bus — **also a real bus**, not a stub: it
 * invokes subscribers with real envelopes. This keeps unit / contract
 * tests deterministic without forcing every test file to mock the bus.
 */
const node_crypto_1 = require("node:crypto");
/**
 * In-memory bus. Dispatches real envelopes to real handlers synchronously.
 * Used when no Redis bus has been initialized. Matches the
 * `RedisStreamEventBus` signature so the singleton can delegate uniformly.
 */
class InMemoryEventBus {
    subscriptions = new Map();
    async publish(eventType, payload, meta) {
        const envelope = {
            eventId: (0, node_crypto_1.randomUUID)(),
            eventType,
            tenantId: meta?.tenantId || '',
            userId: meta?.userId,
            payload,
            timestamp: new Date().toISOString(),
            source: 'dos:in-memory',
            idempotencyKey: meta?.idempotencyKey || (0, node_crypto_1.randomUUID)(),
            version: 1,
        };
        const handlers = this.subscriptions.get(eventType) || [];
        for (const h of handlers) {
            try {
                await h(envelope);
            }
            catch {
                // best-effort — do not fail the publisher on handler error
            }
        }
        return envelope.eventId;
    }
    subscribe(eventType, handler) {
        const list = this.subscriptions.get(eventType) || [];
        list.push(handler);
        this.subscriptions.set(eventType, list);
    }
}
// ── Singleton state ──
let activeBus = new InMemoryEventBus();
const eventTypeRegistry = new Map();
/**
 * Attach a real broker-backed bus (typically `RedisStreamEventBus`). Call
 * from each service's boot path once Redis is reachable. Idempotent: the
 * last bus wins.
 */
function initEventBackbone(bus) {
    activeBus = bus;
}
/** Swap back to in-memory — used by tests that need a clean bus. */
function resetEventBackboneForTesting() {
    activeBus = new InMemoryEventBus();
    eventTypeRegistry.clear();
}
/** Inspect the registry that `registerEventType` writes to. */
function listRegisteredEventTypes() {
    return eventTypeRegistry;
}
/**
 * Legacy positional form: `publish(eventType, tenantId, payload, meta?)`.
 * Used by foundation/agents, tenant-service, workflow-service lifecycle bridge,
 * ai-governance-service, etc. The tenantId is promoted into the envelope meta;
 * optional `meta` is merged into the payload so downstream consumers can
 * read `userId` / `moduleCode` / `entityType` / `entityId` / `category`.
 */
async function publish(eventType, tenantId, payload, meta) {
    const merged = meta
        ? payload && typeof payload === 'object'
            ? { ...payload, ...meta }
            : { value: payload, ...meta }
        : payload;
    const result = activeBus.publish(eventType, merged, {
        tenantId,
        userId: meta?.userId,
        idempotencyKey: meta?.idempotencyKey,
    });
    return typeof result === 'string' ? result : await result;
}
/**
 * High-level module-event shape. Consumers pass the full
 * `{ tenantId, userId, module, event, entityType, entityId, data }`
 * shape — we flatten it into `{ eventType: event, payload: <rest> }`.
 */
async function emitEvent(arg) {
    const payload = {
        module: arg.module,
        entityType: arg.entityType,
        entityId: arg.entityId,
        correlationId: arg.correlationId,
        data: arg.data,
    };
    const result = activeBus.publish(arg.event, payload, {
        tenantId: arg.tenantId,
        userId: arg.userId,
    });
    return typeof result === 'string' ? result : await result;
}
/** Subscribe to an event stream. Handlers receive real envelopes. */
function subscribe(eventType, handler) {
    activeBus.subscribe(eventType, handler);
}
/**
 * Declare an event type so observability/catalog tooling can introspect it.
 * This is metadata-only today; a downstream registry service can persist
 * the accumulated registry via `listRegisteredEventTypes()` on boot.
 */
function registerEventType(arg) {
    eventTypeRegistry.set(arg.eventType, arg);
}
// ── eventBus singleton facade (object-form publish) ──
/**
 * `eventBus.publish({ eventType, tenantId, sourceService, severity, payload })`
 * is the object-form used by the workflow engine and the tenant-service
 * handoff queue. It delegates to the same underlying bus so publishers and
 * subscribers see each other regardless of which shape was used.
 */
exports.eventBus = {
    async publish(arg) {
        const domain = {
            entityType: arg.entityType,
            entityId: arg.entityId,
            action: arg.action,
            triggeredBy: arg.triggeredBy,
            correlationId: arg.correlationId,
            workflowType: arg.workflowType,
            previousState: arg.previousState,
            newState: arg.newState,
            sourceService: arg.sourceService,
            severity: arg.severity,
        };
        const body = arg.payload && typeof arg.payload === 'object'
            ? { ...arg.payload, ...domain }
            : { value: arg.payload, ...domain };
        const payload = arg.data ? { ...body, ...arg.data } : body;
        const result = activeBus.publish(arg.eventType, payload, {
            tenantId: arg.tenantId,
            userId: arg.userId,
            idempotencyKey: arg.idempotencyKey,
        });
        return typeof result === 'string' ? result : await result;
    },
    subscribe(eventType, handler) {
        activeBus.subscribe(eventType, handler);
    },
};
//# sourceMappingURL=singleton.js.map