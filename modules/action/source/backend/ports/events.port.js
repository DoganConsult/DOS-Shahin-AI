"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.eventBus = void 0;
// Backend-level events port barrel — used by services that live at
// modules/<mod>/source/backend/<sub>/... importing via `../../ports/events.port`.
const module_sdk_1 = require("@dos/module-sdk");
exports.eventBus = {
    publish: (...args) => (0, module_sdk_1.getEventBus)().publish(...args),
    subscribe: (...args) => (0, module_sdk_1.getEventBus)().subscribe(...args),
};
exports.emitEvent = module_sdk_1.publishEvent;
//# sourceMappingURL=events.port.js.map