"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.getEventBus = exports._platformEventBus = exports.emitEvent = void 0;
exports.publishEvent = publishEvent;
exports.pushToTenant = pushToTenant;
exports.buildWSEvent = buildWSEvent;
var events_1 = require("@dos/platform-core/events");
Object.defineProperty(exports, "emitEvent", { enumerable: true, get: function () { return events_1.emitEvent; } });
var events_2 = require("@dos/platform-core/events");
Object.defineProperty(exports, "_platformEventBus", { enumerable: true, get: function () { return events_2.eventBus; } });
var events_3 = require("@dos/platform-core/events");
Object.defineProperty(exports, "getEventBus", { enumerable: true, get: function () { return events_3.eventBus; } });
async function publishEvent(...args) { }
function pushToTenant(tenantId, event) { }
function buildWSEvent(type, payload) { return { type, payload, timestamp: new Date().toISOString() }; }
const events_4 = require("@dos/platform-core/events");
exports.eventBus = {
    publish: (...args) => {
        if (args.length === 1 && typeof args[0] === 'object') {
            const { eventType, tenantId, ...rest } = args[0];
            return events_4.eventBus.publish(eventType, tenantId, rest);
        }
        return events_4.eventBus.publish(...args);
    },
    subscribe: (...args) => events_4.eventBus.subscribe(...args),
};
//# sourceMappingURL=events.port.js.map