"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_INVITATION_ACTOR = exports.SYSTEM_EVENT_PROPAGATOR_ACTOR = exports.SYSTEM_SEEDER_ACTOR = exports.SYSTEM_TENANT = exports.SYSTEM_JOB_ACTOR = exports.getProvisionedTenants = exports.registerJob = exports.EC = exports.catchHandler = exports.metricsMiddleware = void 0;
// Backend-level platform port barrel — neutral re-exports that do not
// depend on any module's canonical platform service.
var observability_1 = require("@dos/platform-core/observability");
Object.defineProperty(exports, "metricsMiddleware", { enumerable: true, get: function () { return observability_1.metricsMiddleware; } });
var resilience_1 = require("@dos/platform-core/resilience");
Object.defineProperty(exports, "catchHandler", { enumerable: true, get: function () { return resilience_1.catchHandler; } });
Object.defineProperty(exports, "EC", { enumerable: true, get: function () { return resilience_1.EC; } });
var jobs_1 = require("@dos/platform-core/jobs");
Object.defineProperty(exports, "registerJob", { enumerable: true, get: function () { return jobs_1.registerJob; } });
var tenancy_1 = require("@dos/platform-core/tenancy");
Object.defineProperty(exports, "getProvisionedTenants", { enumerable: true, get: function () { return tenancy_1.getProvisionedTenants; } });
var constants_1 = require("@dos/platform-core/constants");
Object.defineProperty(exports, "SYSTEM_JOB_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_JOB_ACTOR; } });
Object.defineProperty(exports, "SYSTEM_TENANT", { enumerable: true, get: function () { return constants_1.SYSTEM_TENANT; } });
Object.defineProperty(exports, "SYSTEM_SEEDER_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_SEEDER_ACTOR; } });
Object.defineProperty(exports, "SYSTEM_EVENT_PROPAGATOR_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_EVENT_PROPAGATOR_ACTOR; } });
Object.defineProperty(exports, "SYSTEM_INVITATION_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_INVITATION_ACTOR; } });
//# sourceMappingURL=platform.port.js.map