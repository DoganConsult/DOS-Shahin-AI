"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvisionedTenants = exports.sendReminder = exports.generateReminder = exports.enforceStatusTransition = exports.ensureClickHouseTables = exports.chInsert = exports.chQuery = exports.isClickHouseEnabled = exports.checkClickHouseHealth = exports.recordMaturityAssessment = exports.computeMaturityLevel = exports.SYSTEM_JOB_ACTOR = void 0;
var constants_1 = require("@dos/platform-core/constants");
Object.defineProperty(exports, "SYSTEM_JOB_ACTOR", { enumerable: true, get: function () { return constants_1.SYSTEM_JOB_ACTOR; } });
// @ts-ignore - Pragmatic stabilization to unblock build
var platform_core_1 = require("@dos/platform-core");
Object.defineProperty(exports, "computeMaturityLevel", { enumerable: true, get: function () { return platform_core_1.computeMaturityLevel; } });
Object.defineProperty(exports, "recordMaturityAssessment", { enumerable: true, get: function () { return platform_core_1.recordMaturityAssessment; } });
var clickhouse_client_1 = require("../../../config/clickhouse-client");
Object.defineProperty(exports, "checkClickHouseHealth", { enumerable: true, get: function () { return clickhouse_client_1.checkClickHouseHealth; } });
Object.defineProperty(exports, "isClickHouseEnabled", { enumerable: true, get: function () { return clickhouse_client_1.isClickHouseEnabled; } });
Object.defineProperty(exports, "chQuery", { enumerable: true, get: function () { return clickhouse_client_1.chQuery; } });
Object.defineProperty(exports, "chInsert", { enumerable: true, get: function () { return clickhouse_client_1.chInsert; } });
Object.defineProperty(exports, "ensureClickHouseTables", { enumerable: true, get: function () { return clickhouse_client_1.ensureClickHouseTables; } });
// @ts-ignore - Pragmatic stabilization to unblock build
var lifecycle_1 = require("@dos/platform-core/lifecycle");
Object.defineProperty(exports, "enforceStatusTransition", { enumerable: true, get: function () { return lifecycle_1.enforceStatusTransition; } });
var smart_reminder_service_1 = require("../platform/services/misc/smart-reminder.service");
Object.defineProperty(exports, "generateReminder", { enumerable: true, get: function () { return smart_reminder_service_1.generateReminder; } });
Object.defineProperty(exports, "sendReminder", { enumerable: true, get: function () { return smart_reminder_service_1.sendReminder; } });
var jobs_1 = require("@dos/platform-core/jobs");
Object.defineProperty(exports, "getProvisionedTenants", { enumerable: true, get: function () { return jobs_1.getProvisionedTenants; } });
//# sourceMappingURL=platform.port.js.map