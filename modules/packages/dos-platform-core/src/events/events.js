"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
exports.setPlatformEvents = setPlatformEvents;
exports.setPlatformEventExtensions = setPlatformEventExtensions;
exports.subscribe = subscribe;
exports.getSubscriberCount = getSubscriberCount;
exports.publish = publish;
exports.getDeadLetterQueue = getDeadLetterQueue;
exports.drainDeadLetterQueue = drainDeadLetterQueue;
exports.emitEvent = emitEvent;
exports.getEventBus = getEventBus;
exports.onEvent = onEvent;
exports.publishEvent = publishEvent;
exports.getAutomationRules = getAutomationRules;
exports.getAutomationRule = getAutomationRule;
exports.createAutomationRule = createAutomationRule;
exports.updateAutomationRule = updateAutomationRule;
exports.deleteAutomationRule = deleteAutomationRule;
exports.getAutomationLog = getAutomationLog;
exports.seedDefaultAutomationRules = seedDefaultAutomationRules;
exports.registerEventType = registerEventType;
exports.getRegisteredEventTypes = getRegisteredEventTypes;
exports.registerModuleEventTypes = registerModuleEventTypes;
exports.registerEventTypes = registerEventTypes;
exports.getRegisteredTypes = getRegisteredTypes;
exports.verifyEventLogChain = verifyEventLogChain;
let _events = null;
let _eventExtensions = null;
const _inMemoryRegistry = new Map();
function setPlatformEvents(impl) {
    _events = impl;
}
function setPlatformEventExtensions(impl) {
    _eventExtensions = impl;
    for (const reg of _inMemoryRegistry.values()) {
        impl.registerEventType(reg);
    }
    _inMemoryRegistry.clear();
}
function getEvents() {
    if (globalThis.__globalPlatformEvents)
        return globalThis.__globalPlatformEvents;
    if (!_events) {
        throw new Error('PlatformEvents not initialized. Call setPlatformEvents() first.');
    }
    return _events;
}
function getExtensions() {
    if (!_eventExtensions) {
        throw new Error('PlatformEventExtensions not initialized. Call setPlatformEventExtensions() first.');
    }
    return _eventExtensions;
}
function subscribe(sub) {
    return getEvents().subscribe(sub);
}
function getSubscriberCount(eventType) {
    return getEvents().getSubscriberCount(eventType);
}
function publish(eventType, tenantId, payload, opts) {
    return getEvents().publish(eventType, tenantId, payload, opts);
}
function getDeadLetterQueue() {
    return getEvents().getDeadLetterQueue();
}
function drainDeadLetterQueue() {
    return getEvents().drainDeadLetterQueue();
}
function emitEvent(params) {
    return getEvents().emitEvent(params);
}
exports.eventBus = {
    publish: (...args) => getEvents().publish(...args),
    subscribe: (...args) => getEvents().subscribe(...args),
    getSubscribers: () => {
        const events = getEvents();
        if (typeof events.getSubscribers === 'function') {
            return events.getSubscribers();
        }
        return events.eventBus?.getSubscribers?.() ?? {};
    },
};
function getEventBus() {
    return exports.eventBus;
}
function onEvent(eventType, handler) {
    const subscriberId = `${eventType}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    return subscribe({
        subscriberId,
        eventType,
        handler: async (event) => {
            const payload = (event.data ?? event.payload ?? event.metadata ?? {});
            await handler(payload);
        },
    });
}
function publishEvent(event) {
    const eventType = (event.eventType ?? event.event_type ?? event.event ?? 'event.unknown');
    const tenantId = (event.tenantId ?? event.tenant_id ?? 'platform');
    const payload = (event.payload ?? event.data ?? event.metadata ?? {});
    return publish(eventType, tenantId, payload, {
        userId: event.userId,
        actorId: event.actorId ?? event.actor_id,
        moduleCode: (event.moduleCode ?? event.module_code ?? event.module),
        entityType: (event.entityType ?? event.entity_type),
        entityId: (event.entityId ?? event.entity_id),
        severity: event.severity ?? undefined,
        category: event.category ?? undefined,
        correlationId: (event.correlationId ?? event.correlation_id),
    });
}
function getAutomationRules(tenantId, moduleCode) {
    return getExtensions().getAutomationRules(tenantId, moduleCode);
}
function getAutomationRule(tenantId, ruleId) {
    return getExtensions().getAutomationRule(tenantId, ruleId);
}
function createAutomationRule(tenantId, data) {
    return getExtensions().createAutomationRule(tenantId, data);
}
function updateAutomationRule(tenantId, ruleId, data) {
    return getExtensions().updateAutomationRule(tenantId, ruleId, data);
}
function deleteAutomationRule(tenantId, ruleId) {
    return getExtensions().deleteAutomationRule(tenantId, ruleId);
}
function getAutomationLog(tenantId, limit) {
    return getExtensions().getAutomationLog(tenantId, limit);
}
function seedDefaultAutomationRules(tenantId) {
    return getExtensions().seedDefaultAutomationRules(tenantId);
}
function registerEventType(reg) {
    _inMemoryRegistry.set(reg.eventType, reg);
    if (_eventExtensions) {
        _eventExtensions.registerEventType(reg);
    }
}
function getRegisteredEventTypes(moduleCode) {
    const local = Array.from(_inMemoryRegistry.values());
    const filtered = moduleCode ? local.filter(r => r.ownerModule === moduleCode) : local;
    if (_eventExtensions) {
        return _eventExtensions.getRegisteredEventTypes(moduleCode);
    }
    return filtered;
}
function registerModuleEventTypes(moduleCode, eventTypes) {
    for (const et of eventTypes) {
        registerEventType({ eventType: et, category: 'domain', ownerModule: moduleCode });
    }
}
function registerEventTypes(productCode, types) {
    if (_eventExtensions) {
        _eventExtensions.registerEventTypes(productCode, types);
    }
    else {
        for (const et of types) {
            _inMemoryRegistry.set(et, { eventType: et, category: 'domain', ownerModule: productCode });
        }
    }
}
function getRegisteredTypes(productCode) {
    if (_eventExtensions) {
        return _eventExtensions.getRegisteredTypes(productCode);
    }
    const all = Array.from(_inMemoryRegistry.values()).map(r => r.eventType);
    return productCode ? all.filter(et => _inMemoryRegistry.get(et)?.ownerModule === productCode) : all;
}
function verifyEventLogChain(tenantId, since) {
    return getExtensions().verifyEventLogChain(tenantId, since);
}
//# sourceMappingURL=events.js.map