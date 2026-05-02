"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.eventBus = void 0;
exports.notifyDomainChange = notifyDomainChange;
exports.buildWSEvent = buildWSEvent;
exports.pushToTenant = pushToTenant;
var events_1 = require("@dos/platform-core/events");
Object.defineProperty(exports, "eventBus", { enumerable: true, get: function () { return events_1.eventBus; } });
var events_2 = require("@dos/platform-core/events");
Object.defineProperty(exports, "emitEvent", { enumerable: true, get: function () { return events_2.emitEvent; } });
function notifyDomainChange(_tenantId, _module, _action, _entityId) { }
function buildWSEvent(type, payload) { return { type, payload, timestamp: new Date().toISOString() }; }
function pushToTenant(_tenantId, _event) { }
//# sourceMappingURL=events.port.js.map