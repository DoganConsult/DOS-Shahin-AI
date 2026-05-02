"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventBus = exports.setEventBus = void 0;
exports.emitEvent = emitEvent;
// Top-level events port barrel. Pattern matches modules/onboarding/source/ports/events.port.ts.
// Module services import via dynamic `await import('../../../ports/events.port.js')`.
var module_sdk_1 = require("@dos/module-sdk");
Object.defineProperty(exports, "setEventBus", { enumerable: true, get: function () { return module_sdk_1.setEventBus; } });
Object.defineProperty(exports, "getEventBus", { enumerable: true, get: function () { return module_sdk_1.getEventBus; } });
async function emitEvent(event) {
    const bus = globalThis.__serviceBus;
    if (bus?.publish)
        await bus.publish(event.event_type, event, { tenantId: event.tenant_id });
}
