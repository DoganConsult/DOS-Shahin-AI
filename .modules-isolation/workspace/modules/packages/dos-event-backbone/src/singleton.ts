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
import { randomUUID } from 'node:crypto';
import { RedisStreamEventBus } from './redis-stream-bus';
import type { EventEnvelope, EventHandler } from './types';

// ── Public argument shapes (stable contract) ──

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

// ── Internal bus interface (lets in-memory and Redis buses coexist) ──

interface BusLike {
  publish(
    eventType: string,
    payload: unknown,
    meta?: { tenantId?: string; userId?: string; idempotencyKey?: string },
  ): Promise<string> | string;
  subscribe(eventType: string, handler: EventHandler): void;
}

/**
 * In-memory bus. Dispatches real envelopes to real handlers synchronously.
 * Used when no Redis bus has been initialized. Matches the
 * `RedisStreamEventBus` signature so the singleton can delegate uniformly.
 */
class InMemoryEventBus implements BusLike {
  private subscriptions = new Map<string, EventHandler[]>();

  async publish(
    eventType: string,
    payload: unknown,
    meta?: { tenantId?: string; userId?: string; idempotencyKey?: string },
  ): Promise<string> {
    const envelope: EventEnvelope = {
      eventId: randomUUID(),
      eventType,
      tenantId: meta?.tenantId || '',
      userId: meta?.userId,
      payload,
      timestamp: new Date().toISOString(),
      source: 'dos:in-memory',
      idempotencyKey: meta?.idempotencyKey || randomUUID(),
      version: 1,
    };
    const handlers = this.subscriptions.get(eventType) || [];
    for (const h of handlers) {
      try {
        await h(envelope);
      } catch {
        // best-effort — do not fail the publisher on handler error
      }
    }
    return envelope.eventId;
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const list = this.subscriptions.get(eventType) || [];
    list.push(handler);
    this.subscriptions.set(eventType, list);
  }
}

// ── Singleton state ──

let activeBus: BusLike = new InMemoryEventBus();
const eventTypeRegistry = new Map<string, RegisterEventTypeArg>();

/**
 * Attach a real broker-backed bus (typically `RedisStreamEventBus`). Call
 * from each service's boot path once Redis is reachable. Idempotent: the
 * last bus wins.
 */
export function initEventBackbone(bus: RedisStreamEventBus): void {
  activeBus = bus as unknown as BusLike;
}

/** Swap back to in-memory — used by tests that need a clean bus. */
export function resetEventBackboneForTesting(): void {
  activeBus = new InMemoryEventBus();
  eventTypeRegistry.clear();
}

/** Inspect the registry that `registerEventType` writes to. */
export function listRegisteredEventTypes(): ReadonlyMap<string, RegisterEventTypeArg> {
  return eventTypeRegistry;
}

// ── Public free functions (legacy-compatible) ──

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
export async function publish(
  eventType: string,
  tenantId: string,
  payload: unknown,
  meta?: PublishMeta,
): Promise<string> {
  const merged = meta
    ? payload && typeof payload === 'object'
      ? { ...(payload as Record<string, unknown>), ...meta }
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
export async function emitEvent(arg: EmitEventArg): Promise<string> {
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
export function subscribe(eventType: string, handler: EventHandler): void {
  activeBus.subscribe(eventType, handler);
}

/**
 * Declare an event type so observability/catalog tooling can introspect it.
 * This is metadata-only today; a downstream registry service can persist
 * the accumulated registry via `listRegisteredEventTypes()` on boot.
 */
export function registerEventType(arg: RegisterEventTypeArg): void {
  eventTypeRegistry.set(arg.eventType, arg);
}

// ── eventBus singleton facade (object-form publish) ──

/**
 * `eventBus.publish({ eventType, tenantId, sourceService, severity, payload })`
 * is the object-form used by the workflow engine and the tenant-service
 * handoff queue. It delegates to the same underlying bus so publishers and
 * subscribers see each other regardless of which shape was used.
 */
export const eventBus: {
  publish(arg: EventBusPublishArg): Promise<string>;
  subscribe(eventType: string, handler: EventHandler): void;
} = {
  async publish(arg: EventBusPublishArg): Promise<string> {
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
    const body =
      arg.payload && typeof arg.payload === 'object'
        ? { ...(arg.payload as Record<string, unknown>), ...domain }
        : { value: arg.payload, ...domain };
    const payload = arg.data ? { ...body, ...arg.data } : body;
    const result = activeBus.publish(arg.eventType, payload, {
      tenantId: arg.tenantId,
      userId: arg.userId,
      idempotencyKey: arg.idempotencyKey,
    });
    return typeof result === 'string' ? result : await result;
  },
  subscribe(eventType: string, handler: EventHandler): void {
    activeBus.subscribe(eventType, handler);
  },
};
