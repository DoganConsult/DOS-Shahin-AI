import type { 
  PlatformEvent as CanonicalPlatformEvent, 
  EventSubscription,
} from '@dos/types';

export interface EventRegistration {
  eventType: string;
  category: string;
  ownerModule: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
  severity?: string;
  version?: number;
}

export type EventTypeString = string;

export type DOSEventHandler = (event: CanonicalPlatformEvent) => Promise<void> | void;
export type BeforePublishHook = (event: CanonicalPlatformEvent) => Promise<CanonicalPlatformEvent | null> | CanonicalPlatformEvent | null;
export type AfterPublishHook = (event: CanonicalPlatformEvent) => Promise<void> | void;

export interface EmitEventParams {
  event: string;
  module: string;
  tenantId: string;
  data?: Record<string, unknown>;
  userId?: string;
  entityType?: string;
  entityId?: string;
}

export interface PlatformEvents {
  subscribe(sub: EventSubscription): () => void;
  getSubscriberCount(eventType?: string): number;
  getSubscribers?(): Record<string, string[]>;
  publish<T = Record<string, unknown>>(
    eventType: string,
    tenantId: string,
    payload: T,
    opts?: {
      userId?: string;
      actorId?: string;
      moduleCode?: string;
      entityType?: string;
      entityId?: string;
      severity?: 'info' | 'warn' | 'error' | 'critical';
      category?: 'security' | 'audit' | 'system' | 'domain';
      correlationId?: string;
      causationId?: string;
    }
  ): Promise<string>;
  getDeadLetterQueue(): Array<{ event: CanonicalPlatformEvent; error: string; failedAt: Date }>;
  drainDeadLetterQueue(): Array<{ event: CanonicalPlatformEvent; error: string; failedAt: Date }>;
  emitEvent(params: EmitEventParams): Promise<string>;
  eventBus?: any;
}

export interface PlatformEventExtensions {
  getAutomationRules(tenantId: string, moduleCode?: string): Promise<Record<string, unknown>[]>;
  getAutomationRule(tenantId: string, ruleId: string): Promise<unknown>;
  createAutomationRule(tenantId: string, data: Record<string, unknown>): Promise<unknown>;
  updateAutomationRule(tenantId: string, ruleId: string, data: Record<string, unknown>): Promise<unknown>;
  deleteAutomationRule(tenantId: string, ruleId: string): Promise<void>;
  getAutomationLog(tenantId: string, limit?: number): Promise<Record<string, unknown>[]>;
  seedDefaultAutomationRules(tenantId: string): Promise<number>;
  registerEventType(reg: EventRegistration): void;
  getRegisteredEventTypes(moduleCode?: string): EventRegistration[];
  registerModuleEventTypes(moduleCode: string, eventTypes: string[]): void;
  registerEventTypes(productCode: string, types: readonly string[]): void;
  getRegisteredTypes(productCode?: string): string[];
  verifyEventLogChain(tenantId: string, since?: string): Promise<{ valid: boolean; brokenAt?: string; totalChecked: number }>;
}

let _events: PlatformEvents | null = null;
let _eventExtensions: PlatformEventExtensions | null = null;

const _inMemoryRegistry = new Map<string, EventRegistration>();

export function setPlatformEvents(impl: PlatformEvents): void {
  _events = impl;
}

export function setPlatformEventExtensions(impl: PlatformEventExtensions): void {
  _eventExtensions = impl;
  for (const reg of _inMemoryRegistry.values()) {
    impl.registerEventType(reg);
  }
  _inMemoryRegistry.clear();
}

function getEvents(): PlatformEvents {
  if ((globalThis as any).__globalPlatformEvents) return (globalThis as any).__globalPlatformEvents;
  if (!_events) {
    throw new Error('PlatformEvents not initialized. Call setPlatformEvents() first.');
  }
  return _events;
}

function getExtensions(): PlatformEventExtensions {
  if (!_eventExtensions) {
    throw new Error('PlatformEventExtensions not initialized. Call setPlatformEventExtensions() first.');
  }
  return _eventExtensions;
}

export function subscribe(sub: EventSubscription): () => void {
  return getEvents().subscribe(sub);
}

export function getSubscriberCount(eventType?: string): number {
  return getEvents().getSubscriberCount(eventType);
}

export function publish<T = Record<string, unknown>>(
  eventType: string,
  tenantId: string,
  payload: T,
  opts?: Parameters<PlatformEvents['publish']>[3]
): Promise<string> {
  return getEvents().publish(eventType, tenantId, payload, opts);
}

export function getDeadLetterQueue(): Array<{ event: CanonicalPlatformEvent; error: string; failedAt: Date }> {
  return getEvents().getDeadLetterQueue();
}

export function drainDeadLetterQueue(): Array<{ event: CanonicalPlatformEvent; error: string; failedAt: Date }> {
  return getEvents().drainDeadLetterQueue();
}

export function emitEvent(params: EmitEventParams): Promise<string> {
  return getEvents().emitEvent(params);
}

export const eventBus = {
  publish: <T>(...args: Parameters<PlatformEvents['publish']>) => getEvents().publish(...args),
  subscribe: (...args: Parameters<PlatformEvents['subscribe']>) => getEvents().subscribe(...args),
  getSubscribers: (): Record<string, string[]> => {
    const events = getEvents();
    if (typeof events.getSubscribers === 'function') {
      return events.getSubscribers();
    }
    return events.eventBus?.getSubscribers?.() ?? {};
  },
};

export function getEventBus(): typeof eventBus {
  return eventBus;
}

export function onEvent(eventType: string, handler: (payload: Record<string, unknown>) => Promise<void> | void): () => void {
  const subscriberId = `${eventType}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  return subscribe({
    subscriberId,
    eventType,
    handler: async (event) => {
      const payload = (event.data ?? event.payload ?? event.metadata ?? {}) as Record<string, unknown>;
      await handler(payload);
    },
  });
}

export function publishEvent(event: CanonicalPlatformEvent): Promise<string> {
  const eventType = (event.eventType ?? event.event_type ?? event.event ?? 'event.unknown') as string;
  const tenantId = (event.tenantId ?? event.tenant_id ?? 'platform') as string;
  const payload = (event.payload ?? event.data ?? event.metadata ?? {}) as Record<string, unknown>;
  return publish(eventType, tenantId, payload, {
    userId: event.userId,
    actorId: event.actorId ?? event.actor_id,
    moduleCode: (event.moduleCode ?? event.module_code ?? event.module) as string | undefined,
    entityType: (event.entityType ?? event.entity_type) as string | undefined,
    entityId: (event.entityId ?? event.entity_id) as string | undefined,
    severity: (event.severity as any) ?? undefined,
    category: (event.category as any) ?? undefined,
    correlationId: (event.correlationId ?? event.correlation_id) as string | undefined,
  });
}

export function getAutomationRules(tenantId: string, moduleCode?: string): Promise<Record<string, unknown>[]> {
  return getExtensions().getAutomationRules(tenantId, moduleCode);
}

export function getAutomationRule(tenantId: string, ruleId: string): Promise<unknown> {
  return getExtensions().getAutomationRule(tenantId, ruleId);
}

export function createAutomationRule(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  return getExtensions().createAutomationRule(tenantId, data);
}

export function updateAutomationRule(tenantId: string, ruleId: string, data: Record<string, unknown>): Promise<unknown> {
  return getExtensions().updateAutomationRule(tenantId, ruleId, data);
}

export function deleteAutomationRule(tenantId: string, ruleId: string): Promise<void> {
  return getExtensions().deleteAutomationRule(tenantId, ruleId);
}

export function getAutomationLog(tenantId: string, limit?: number): Promise<Record<string, unknown>[]> {
  return getExtensions().getAutomationLog(tenantId, limit);
}

export function seedDefaultAutomationRules(tenantId: string): Promise<number> {
  return getExtensions().seedDefaultAutomationRules(tenantId);
}

export function registerEventType(reg: EventRegistration): void {
  _inMemoryRegistry.set(reg.eventType, reg);
  if (_eventExtensions) {
    _eventExtensions.registerEventType(reg);
  }
}

export function getRegisteredEventTypes(moduleCode?: string): EventRegistration[] {
  const local = Array.from(_inMemoryRegistry.values());
  const filtered = moduleCode ? local.filter(r => r.ownerModule === moduleCode) : local;
  if (_eventExtensions) {
    return _eventExtensions.getRegisteredEventTypes(moduleCode);
  }
  return filtered;
}

export function registerModuleEventTypes(moduleCode: string, eventTypes: string[]): void {
  for (const et of eventTypes) {
    registerEventType({ eventType: et, category: 'domain', ownerModule: moduleCode });
  }
}

export function registerEventTypes(productCode: string, types: readonly string[]): void {
  if (_eventExtensions) {
    _eventExtensions.registerEventTypes(productCode, types);
  } else {
    for (const et of types) {
      _inMemoryRegistry.set(et, { eventType: et, category: 'domain', ownerModule: productCode });
    }
  }
}

export function getRegisteredTypes(productCode?: string): string[] {
  if (_eventExtensions) {
    return _eventExtensions.getRegisteredTypes(productCode);
  }
  const all = Array.from(_inMemoryRegistry.values()).map(r => r.eventType);
  return productCode ? all.filter(et => _inMemoryRegistry.get(et)?.ownerModule === productCode) : all;
}

export function verifyEventLogChain(
  tenantId: string,
  since?: string,
): Promise<{ valid: boolean; brokenAt?: string; totalChecked: number }> {
  return getExtensions().verifyEventLogChain(tenantId, since);
}

