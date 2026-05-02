"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEventBus = setEventBus;
exports.getEventBus = getEventBus;
exports.publishEvent = publishEvent;
exports.subscribeEvent = subscribeEvent;
const GLOBAL_EVENT_KEY = Symbol.for('__dos_sdk_event_bus__');
function setEventBus(bus) {
    globalThis[GLOBAL_EVENT_KEY] = bus;
}
function getEventBus() {
    const bus = globalThis[GLOBAL_EVENT_KEY];
    if (!bus) {
        throw new Error('[DOS-SDK] EventBus not initialized. Call setEventBus() during platform startup.');
    }
    return bus;
}
function publishEvent(event) {
    return getEventBus().publish(event);
}
function subscribeEvent(eventType, subscriberId, handler) {
    getEventBus().subscribe(eventType, subscriberId, handler);
}
//# sourceMappingURL=events.js.map