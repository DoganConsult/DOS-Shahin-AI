"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordsBulkStatusChangeSchema = exports.recordsBulkUpdateSchema = exports.recordsAdminConfigSchema = exports.recordsExportRequestSchema = exports.recordsImportBatchSchema = exports.recordsImportRowSchema = exports.recordsStatusTransitionSchema = exports.recordsEventPayloadSchema = exports.recordsListResponseSchema = exports.recordsResponseSchema = exports.toImportEntity = exports.stripFieldsForExport = exports.redactForAudit = exports.toListItem = exports.toAdminResponse = exports.toAudienceShaped = exports.RECORDS_EVENT_CORRELATION = exports.RECORDS_EVENT_SECURITY = exports.RECORDS_EVENT_ORDERING = exports.RECORDS_EVENT_LEGACY_ALIASES = exports.RECORDS_CONSUMED_EVENTS = exports.RECORDS_PUBLISHED_EVENTS = exports.RECORDS_EVENT_CONTRACT = exports.recordsAdminRoutes = exports.recordsQuery = exports.onFailure = exports.onClosure = exports.onEscalation = exports.onApprovalRequired = exports.onTaskCreated = exports.onWorkflowTriggered = exports.getRecordsJobs = exports.isRecordsAiActionBlocked = exports.isRecordsAiActionAllowed = exports.RECORDS_AI_CONFIG = exports.emitRecordsStatusChange = exports.emitRecordsEvent = exports.seedRecordsModule = exports.getRecordsSeedData = exports.RECORDS_SLA_DEFAULTS = exports.RECORDS_TIMEOUTS = exports.RECORDS_LIMITS = exports.RECORDS_DEFAULT_STATUS = exports.RECORDS_STATUSES = exports.RECORDS_POLICY = void 0;
// ── Records Module — Barrel Export ──────────────────────────────
// Runtime exports
var records_policies_1 = require("./policies/records.policies");
Object.defineProperty(exports, "RECORDS_POLICY", { enumerable: true, get: function () { return records_policies_1.RECORDS_POLICY; } });
var records_constants_1 = require("./data/records-constants");
Object.defineProperty(exports, "RECORDS_STATUSES", { enumerable: true, get: function () { return records_constants_1.RECORDS_STATUSES; } });
Object.defineProperty(exports, "RECORDS_DEFAULT_STATUS", { enumerable: true, get: function () { return records_constants_1.RECORDS_DEFAULT_STATUS; } });
Object.defineProperty(exports, "RECORDS_LIMITS", { enumerable: true, get: function () { return records_constants_1.RECORDS_LIMITS; } });
Object.defineProperty(exports, "RECORDS_TIMEOUTS", { enumerable: true, get: function () { return records_constants_1.RECORDS_TIMEOUTS; } });
Object.defineProperty(exports, "RECORDS_SLA_DEFAULTS", { enumerable: true, get: function () { return records_constants_1.RECORDS_SLA_DEFAULTS; } });
var records_seed_1 = require("./data/records-seed");
Object.defineProperty(exports, "getRecordsSeedData", { enumerable: true, get: function () { return records_seed_1.getRecordsSeedData; } });
Object.defineProperty(exports, "seedRecordsModule", { enumerable: true, get: function () { return records_seed_1.seedRecordsModule; } });
var records_event_service_1 = require("./services/records-event.service");
Object.defineProperty(exports, "emitRecordsEvent", { enumerable: true, get: function () { return records_event_service_1.emitRecordsEvent; } });
Object.defineProperty(exports, "emitRecordsStatusChange", { enumerable: true, get: function () { return records_event_service_1.emitRecordsStatusChange; } });
var records_ai_service_1 = require("./services/records-ai.service");
Object.defineProperty(exports, "RECORDS_AI_CONFIG", { enumerable: true, get: function () { return records_ai_service_1.RECORDS_AI_CONFIG; } });
Object.defineProperty(exports, "isRecordsAiActionAllowed", { enumerable: true, get: function () { return records_ai_service_1.isRecordsAiActionAllowed; } });
Object.defineProperty(exports, "isRecordsAiActionBlocked", { enumerable: true, get: function () { return records_ai_service_1.isRecordsAiActionBlocked; } });
var records_monitor_job_1 = require("./jobs/records-monitor.job");
Object.defineProperty(exports, "getRecordsJobs", { enumerable: true, get: function () { return records_monitor_job_1.getRecordsJobs; } });
var records_workflow_service_1 = require("./services/records-workflow.service");
Object.defineProperty(exports, "onWorkflowTriggered", { enumerable: true, get: function () { return records_workflow_service_1.onWorkflowTriggered; } });
Object.defineProperty(exports, "onTaskCreated", { enumerable: true, get: function () { return records_workflow_service_1.onTaskCreated; } });
Object.defineProperty(exports, "onApprovalRequired", { enumerable: true, get: function () { return records_workflow_service_1.onApprovalRequired; } });
Object.defineProperty(exports, "onEscalation", { enumerable: true, get: function () { return records_workflow_service_1.onEscalation; } });
Object.defineProperty(exports, "onClosure", { enumerable: true, get: function () { return records_workflow_service_1.onClosure; } });
Object.defineProperty(exports, "onFailure", { enumerable: true, get: function () { return records_workflow_service_1.onFailure; } });
exports.recordsQuery = __importStar(require("./repositories/records-query.repo"));
var records_admin_routes_1 = require("./routes/records-admin.routes");
Object.defineProperty(exports, "recordsAdminRoutes", { enumerable: true, get: function () { return __importDefault(records_admin_routes_1).default; } });
var records_events_1 = require("./events/records.events");
Object.defineProperty(exports, "RECORDS_EVENT_CONTRACT", { enumerable: true, get: function () { return records_events_1.RECORDS_EVENT_CONTRACT; } });
Object.defineProperty(exports, "RECORDS_PUBLISHED_EVENTS", { enumerable: true, get: function () { return records_events_1.RECORDS_PUBLISHED_EVENTS; } });
Object.defineProperty(exports, "RECORDS_CONSUMED_EVENTS", { enumerable: true, get: function () { return records_events_1.RECORDS_CONSUMED_EVENTS; } });
Object.defineProperty(exports, "RECORDS_EVENT_LEGACY_ALIASES", { enumerable: true, get: function () { return records_events_1.RECORDS_EVENT_LEGACY_ALIASES; } });
Object.defineProperty(exports, "RECORDS_EVENT_ORDERING", { enumerable: true, get: function () { return records_events_1.RECORDS_EVENT_ORDERING; } });
Object.defineProperty(exports, "RECORDS_EVENT_SECURITY", { enumerable: true, get: function () { return records_events_1.RECORDS_EVENT_SECURITY; } });
Object.defineProperty(exports, "RECORDS_EVENT_CORRELATION", { enumerable: true, get: function () { return records_events_1.RECORDS_EVENT_CORRELATION; } });
var records_mapper_1 = require("./mappers/records.mapper");
Object.defineProperty(exports, "toAudienceShaped", { enumerable: true, get: function () { return records_mapper_1.toAudienceShaped; } });
Object.defineProperty(exports, "toAdminResponse", { enumerable: true, get: function () { return records_mapper_1.toAdminResponse; } });
Object.defineProperty(exports, "toListItem", { enumerable: true, get: function () { return records_mapper_1.toListItem; } });
Object.defineProperty(exports, "redactForAudit", { enumerable: true, get: function () { return records_mapper_1.redactForAudit; } });
Object.defineProperty(exports, "stripFieldsForExport", { enumerable: true, get: function () { return records_mapper_1.stripFieldsForExport; } });
Object.defineProperty(exports, "toImportEntity", { enumerable: true, get: function () { return records_mapper_1.toImportEntity; } });
var records_schemas_1 = require("./schemas/records.schemas");
Object.defineProperty(exports, "recordsResponseSchema", { enumerable: true, get: function () { return records_schemas_1.recordsResponseSchema; } });
Object.defineProperty(exports, "recordsListResponseSchema", { enumerable: true, get: function () { return records_schemas_1.recordsListResponseSchema; } });
Object.defineProperty(exports, "recordsEventPayloadSchema", { enumerable: true, get: function () { return records_schemas_1.recordsEventPayloadSchema; } });
Object.defineProperty(exports, "recordsStatusTransitionSchema", { enumerable: true, get: function () { return records_schemas_1.recordsStatusTransitionSchema; } });
Object.defineProperty(exports, "recordsImportRowSchema", { enumerable: true, get: function () { return records_schemas_1.recordsImportRowSchema; } });
Object.defineProperty(exports, "recordsImportBatchSchema", { enumerable: true, get: function () { return records_schemas_1.recordsImportBatchSchema; } });
Object.defineProperty(exports, "recordsExportRequestSchema", { enumerable: true, get: function () { return records_schemas_1.recordsExportRequestSchema; } });
Object.defineProperty(exports, "recordsAdminConfigSchema", { enumerable: true, get: function () { return records_schemas_1.recordsAdminConfigSchema; } });
Object.defineProperty(exports, "recordsBulkUpdateSchema", { enumerable: true, get: function () { return records_schemas_1.recordsBulkUpdateSchema; } });
Object.defineProperty(exports, "recordsBulkStatusChangeSchema", { enumerable: true, get: function () { return records_schemas_1.recordsBulkStatusChangeSchema; } });
//# sourceMappingURL=index.js.map