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
exports.analyticsBulkStatusChangeSchema = exports.analyticsBulkUpdateSchema = exports.analyticsAdminConfigSchema = exports.analyticsExportRequestSchema = exports.analyticsImportBatchSchema = exports.analyticsImportRowSchema = exports.analyticsStatusTransitionSchema = exports.analyticsEventPayloadSchema = exports.analyticsListResponseSchema = exports.analyticsResponseSchema = exports.toImportEntity = exports.stripFieldsForExport = exports.redactForAudit = exports.toListItem = exports.toAdminResponse = exports.toAudienceShaped = exports.ANALYTICS_EVENT_CORRELATION = exports.ANALYTICS_EVENT_SECURITY = exports.ANALYTICS_EVENT_ORDERING = exports.ANALYTICS_EVENT_LEGACY_ALIASES = exports.ANALYTICS_CONSUMED_EVENTS = exports.ANALYTICS_PUBLISHED_EVENTS = exports.ANALYTICS_EVENT_CONTRACT = exports.analyticsAdminRoutes = exports.analyticsQuery = exports.onFailure = exports.onClosure = exports.onEscalation = exports.onApprovalRequired = exports.onTaskCreated = exports.onWorkflowTriggered = exports.getAnalyticsJobs = exports.isAnalyticsAiActionBlocked = exports.isAnalyticsAiActionAllowed = exports.ANALYTICS_AI_CONFIG = exports.emitAnalyticsStatusChange = exports.emitAnalyticsEvent = exports.seedAnalyticsModule = exports.getAnalyticsSeedData = exports.ANALYTICS_SLA_DEFAULTS = exports.ANALYTICS_TIMEOUTS = exports.ANALYTICS_LIMITS = exports.ANALYTICS_DEFAULT_STATUS = exports.ANALYTICS_STATUSES = exports.ANALYTICS_POLICY = void 0;
// ── Analytics Module — Barrel Export ──────────────────────────────
// Runtime exports
var analytics_policies_1 = require("./policies/analytics.policies");
Object.defineProperty(exports, "ANALYTICS_POLICY", { enumerable: true, get: function () { return analytics_policies_1.ANALYTICS_POLICY; } });
var analytics_constants_1 = require("./data/analytics-constants");
Object.defineProperty(exports, "ANALYTICS_STATUSES", { enumerable: true, get: function () { return analytics_constants_1.ANALYTICS_STATUSES; } });
Object.defineProperty(exports, "ANALYTICS_DEFAULT_STATUS", { enumerable: true, get: function () { return analytics_constants_1.ANALYTICS_DEFAULT_STATUS; } });
Object.defineProperty(exports, "ANALYTICS_LIMITS", { enumerable: true, get: function () { return analytics_constants_1.ANALYTICS_LIMITS; } });
Object.defineProperty(exports, "ANALYTICS_TIMEOUTS", { enumerable: true, get: function () { return analytics_constants_1.ANALYTICS_TIMEOUTS; } });
Object.defineProperty(exports, "ANALYTICS_SLA_DEFAULTS", { enumerable: true, get: function () { return analytics_constants_1.ANALYTICS_SLA_DEFAULTS; } });
var analytics_seed_1 = require("./data/analytics-seed");
Object.defineProperty(exports, "getAnalyticsSeedData", { enumerable: true, get: function () { return analytics_seed_1.getAnalyticsSeedData; } });
Object.defineProperty(exports, "seedAnalyticsModule", { enumerable: true, get: function () { return analytics_seed_1.seedAnalyticsModule; } });
var analytics_event_service_1 = require("./services/analytics/analytics-event.service");
Object.defineProperty(exports, "emitAnalyticsEvent", { enumerable: true, get: function () { return analytics_event_service_1.emitAnalyticsEvent; } });
Object.defineProperty(exports, "emitAnalyticsStatusChange", { enumerable: true, get: function () { return analytics_event_service_1.emitAnalyticsStatusChange; } });
var analytics_ai_service_1 = require("./services/analytics/analytics-ai.service");
Object.defineProperty(exports, "ANALYTICS_AI_CONFIG", { enumerable: true, get: function () { return analytics_ai_service_1.ANALYTICS_AI_CONFIG; } });
Object.defineProperty(exports, "isAnalyticsAiActionAllowed", { enumerable: true, get: function () { return analytics_ai_service_1.isAnalyticsAiActionAllowed; } });
Object.defineProperty(exports, "isAnalyticsAiActionBlocked", { enumerable: true, get: function () { return analytics_ai_service_1.isAnalyticsAiActionBlocked; } });
var analytics_monitor_job_1 = require("./jobs/analytics-monitor.job");
Object.defineProperty(exports, "getAnalyticsJobs", { enumerable: true, get: function () { return analytics_monitor_job_1.getAnalyticsJobs; } });
var analytics_workflow_service_1 = require("./services/analytics/analytics-workflow.service");
Object.defineProperty(exports, "onWorkflowTriggered", { enumerable: true, get: function () { return analytics_workflow_service_1.onWorkflowTriggered; } });
Object.defineProperty(exports, "onTaskCreated", { enumerable: true, get: function () { return analytics_workflow_service_1.onTaskCreated; } });
Object.defineProperty(exports, "onApprovalRequired", { enumerable: true, get: function () { return analytics_workflow_service_1.onApprovalRequired; } });
Object.defineProperty(exports, "onEscalation", { enumerable: true, get: function () { return analytics_workflow_service_1.onEscalation; } });
Object.defineProperty(exports, "onClosure", { enumerable: true, get: function () { return analytics_workflow_service_1.onClosure; } });
Object.defineProperty(exports, "onFailure", { enumerable: true, get: function () { return analytics_workflow_service_1.onFailure; } });
exports.analyticsQuery = __importStar(require("./repositories/analytics-query.repo"));
var analytics_admin_routes_1 = require("./routes/analytics-admin.routes");
Object.defineProperty(exports, "analyticsAdminRoutes", { enumerable: true, get: function () { return __importDefault(analytics_admin_routes_1).default; } });
var analytics_events_1 = require("./events/analytics.events");
Object.defineProperty(exports, "ANALYTICS_EVENT_CONTRACT", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_EVENT_CONTRACT; } });
Object.defineProperty(exports, "ANALYTICS_PUBLISHED_EVENTS", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_PUBLISHED_EVENTS; } });
Object.defineProperty(exports, "ANALYTICS_CONSUMED_EVENTS", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_CONSUMED_EVENTS; } });
Object.defineProperty(exports, "ANALYTICS_EVENT_LEGACY_ALIASES", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_EVENT_LEGACY_ALIASES; } });
Object.defineProperty(exports, "ANALYTICS_EVENT_ORDERING", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_EVENT_ORDERING; } });
Object.defineProperty(exports, "ANALYTICS_EVENT_SECURITY", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_EVENT_SECURITY; } });
Object.defineProperty(exports, "ANALYTICS_EVENT_CORRELATION", { enumerable: true, get: function () { return analytics_events_1.ANALYTICS_EVENT_CORRELATION; } });
var analytics_mapper_1 = require("./mappers/analytics.mapper");
Object.defineProperty(exports, "toAudienceShaped", { enumerable: true, get: function () { return analytics_mapper_1.toAudienceShaped; } });
Object.defineProperty(exports, "toAdminResponse", { enumerable: true, get: function () { return analytics_mapper_1.toAdminResponse; } });
Object.defineProperty(exports, "toListItem", { enumerable: true, get: function () { return analytics_mapper_1.toListItem; } });
Object.defineProperty(exports, "redactForAudit", { enumerable: true, get: function () { return analytics_mapper_1.redactForAudit; } });
Object.defineProperty(exports, "stripFieldsForExport", { enumerable: true, get: function () { return analytics_mapper_1.stripFieldsForExport; } });
Object.defineProperty(exports, "toImportEntity", { enumerable: true, get: function () { return analytics_mapper_1.toImportEntity; } });
var analytics_schemas_1 = require("./schemas/analytics.schemas");
Object.defineProperty(exports, "analyticsResponseSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsResponseSchema; } });
Object.defineProperty(exports, "analyticsListResponseSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsListResponseSchema; } });
Object.defineProperty(exports, "analyticsEventPayloadSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsEventPayloadSchema; } });
Object.defineProperty(exports, "analyticsStatusTransitionSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsStatusTransitionSchema; } });
Object.defineProperty(exports, "analyticsImportRowSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsImportRowSchema; } });
Object.defineProperty(exports, "analyticsImportBatchSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsImportBatchSchema; } });
Object.defineProperty(exports, "analyticsExportRequestSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsExportRequestSchema; } });
Object.defineProperty(exports, "analyticsAdminConfigSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsAdminConfigSchema; } });
Object.defineProperty(exports, "analyticsBulkUpdateSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsBulkUpdateSchema; } });
Object.defineProperty(exports, "analyticsBulkStatusChangeSchema", { enumerable: true, get: function () { return analytics_schemas_1.analyticsBulkStatusChangeSchema; } });
//# sourceMappingURL=index.js.map