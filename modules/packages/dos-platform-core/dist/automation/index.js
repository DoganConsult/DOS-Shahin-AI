"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkersByOwner = exports.getRegisteredWorkers = exports.registerAutomationWorker = exports.tenantAutomationEngine = exports.TenantAutomationEngine = void 0;
/**
 * DOS Tenant Automation Engine — Canonical Barrel
 *
 * Generic per-tenant automation engine. Products register their
 * domain-specific workers via registerAutomationWorker().
 *
 * @owner DOS
 * @since 2026-03-30
 */
var tenant_automation_engine_service_1 = require("./tenant-automation-engine.service");
Object.defineProperty(exports, "TenantAutomationEngine", { enumerable: true, get: function () { return tenant_automation_engine_service_1.TenantAutomationEngine; } });
Object.defineProperty(exports, "tenantAutomationEngine", { enumerable: true, get: function () { return tenant_automation_engine_service_1.tenantAutomationEngine; } });
Object.defineProperty(exports, "registerAutomationWorker", { enumerable: true, get: function () { return tenant_automation_engine_service_1.registerAutomationWorker; } });
Object.defineProperty(exports, "getRegisteredWorkers", { enumerable: true, get: function () { return tenant_automation_engine_service_1.getRegisteredWorkers; } });
Object.defineProperty(exports, "getWorkersByOwner", { enumerable: true, get: function () { return tenant_automation_engine_service_1.getWorkersByOwner; } });
//# sourceMappingURL=index.js.map