"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordActivity = exports.enforceStatusTransition = exports.SYSTEM_JOB_ACTOR = void 0;
var constants_1 = require("@dos/platform-core/constants");
Object.defineProperty(exports, "SYSTEM_JOB_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_JOB_ACTOR; } });
// @ts-ignore - Pragmatic stabilization to unblock build
var lifecycle_1 = require("@dos/platform-core/lifecycle");
Object.defineProperty(exports, "enforceStatusTransition", { enumerable: true, get: function () { return lifecycle_1.enforceStatusTransition; } });
// @ts-ignore - Pragmatic stabilization to unblock build
var platform_core_1 = require("@dos/platform-core");
Object.defineProperty(exports, "recordActivity", { enumerable: true, get: function () { return platform_core_1.recordActivity; } });
//# sourceMappingURL=platform.port.js.map