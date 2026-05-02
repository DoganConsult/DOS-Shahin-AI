"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvisionedTenants = exports.registerJob = exports.SYSTEM_JOB_ACTOR = void 0;
exports.getActiveModuleCodes = getActiveModuleCodes;
var constants_1 = require("@dos/platform-core/constants");
Object.defineProperty(exports, "SYSTEM_JOB_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_JOB_ACTOR; } });
var jobs_1 = require("@dos/platform-core/jobs");
Object.defineProperty(exports, "registerJob", { enumerable: true, get: function () { return jobs_1.registerJob; } });
var tenancy_1 = require("@dos/platform-core/tenancy");
Object.defineProperty(exports, "getProvisionedTenants", { enumerable: true, get: function () { return tenancy_1.getProvisionedTenants; } });
async function getActiveModuleCodes(_tenantId) {
    return ['foundation', 'compliance', 'admin', 'evidence', 'workflow', 'action'];
}
//# sourceMappingURL=platform.port.js.map