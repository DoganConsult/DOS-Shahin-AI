"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.eventBus = void 0;
const module_sdk_1 = require("@dos/module-sdk");
exports.eventBus = {
    publish: (...args) => (0, module_sdk_1.getEventBus)().publish(...args),
    subscribe: (...args) => (0, module_sdk_1.getEventBus)().subscribe(...args),
    onAfterPublish: (...args) => {
        const bus = (0, module_sdk_1.getEventBus)();
        if (typeof bus.onAfterPublish === 'function')
            return bus.onAfterPublish(...args);
    },
};
exports.emitEvent = module_sdk_1.publishEvent;
//# sourceMappingURL=events.port.js.map