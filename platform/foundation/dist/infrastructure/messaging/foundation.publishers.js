"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPublisher = setPublisher;
exports.subscribeForTenant = subscribeForTenant;
exports.publish = publish;
exports.getPublishedEventNames = getPublishedEventNames;
const logger_port_1 = require("../../ports/logger.port");
const foundation_events_1 = require("./foundation.events");
let _publisher = null;
function setPublisher(fn) {
    _publisher = fn;
}
const _sseSubscribers = new Map(); // tenantId -> set
function subscribeForTenant(tenantId, fn) {
    let set = _sseSubscribers.get(tenantId);
    if (!set) {
        set = new Set();
        _sseSubscribers.set(tenantId, set);
    }
    set.add(fn);
    return () => {
        set.delete(fn);
        if (set.size === 0)
            _sseSubscribers.delete(tenantId);
    };
}
async function publish(eventName, payload) {
    if (!foundation_events_1.FOUNDATION_EVENT_CONTRACT.published[eventName]) {
        logger_port_1.logger.warn(`[${foundation_events_1.FOUNDATION_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: foundation_events_1.FOUNDATION_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    // Fan out to local SSE subscribers for the tenant of this event.
    const tenantId = payload?.tenantId;
    if (tenantId) {
        const set = _sseSubscribers.get(tenantId);
        if (set)
            for (const fn of set) {
                try {
                    fn(eventName, fullPayload);
                }
                catch { /* swallow */ }
            }
    }
    logger_port_1.logger.debug(`[${foundation_events_1.FOUNDATION_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
function getPublishedEventNames() {
    return Object.keys(foundation_events_1.FOUNDATION_EVENT_CONTRACT.published);
}
//# sourceMappingURL=foundation.publishers.js.map