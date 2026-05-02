"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_JOB_ACTOR = exports.getEventBus = exports.getModuleRegistry = void 0;
var platform_core_1 = require("@dos/platform-core");
Object.defineProperty(exports, "getModuleRegistry", { enumerable: true, get: function () { return platform_core_1.getAgentCatalog; } });
var events_1 = require("@dos/platform-core/events");
Object.defineProperty(exports, "getEventBus", { enumerable: true, get: function () { return events_1.eventBus; } });
exports.SYSTEM_JOB_ACTOR = 'system:provisioning';
//# sourceMappingURL=platform.port.js.map