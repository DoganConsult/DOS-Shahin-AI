export { RedisStreamEventBus } from './redis-stream-bus';
export type { EventBusMetrics } from './redis-stream-bus';
export { DualPublishBridge } from './bridge';
export { createEventBackbone, createDualPublishBridge } from './factory';
export { DeadLetterQueue } from './dead-letter-queue';
export type { DeadLetterEntry, DLQConfig } from './dead-letter-queue';
export type { EventBackboneConfig, EventHandler, EventEnvelope, EventSubscription, BackboneLogger } from './types';

// Canonical public contract for consumers (workflow engine, agent services,
// tenant-service, foundation modules). See singleton.ts for the rationale.
export {
  eventBus,
  publish,
  emitEvent,
  subscribe,
  registerEventType,
  initEventBackbone,
  resetEventBackboneForTesting,
  listRegisteredEventTypes,
} from './singleton';
export type {
  EventBusPublishArg,
  EmitEventArg,
  RegisterEventTypeArg,
  PublishMeta,
} from './singleton';
