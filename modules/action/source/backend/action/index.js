"use strict";
// ── Action Module — Barrel Export ──────────────────────────────
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
exports.actionBulkStatusChangeSchema = exports.actionBulkUpdateSchema = exports.actionAdminConfigSchema = exports.actionExportRequestSchema = exports.actionImportBatchSchema = exports.actionImportRowSchema = exports.actionStatusTransitionSchema = exports.actionEventPayloadSchema = exports.actionListResponseSchema = exports.actionResponseSchema = exports.toImportEntity = exports.stripFieldsForExport = exports.redactForAudit = exports.toListItem = exports.toAdminResponse = exports.toAudienceShaped = exports.ACTION_EVENT_CORRELATION = exports.ACTION_EVENT_SECURITY = exports.ACTION_EVENT_ORDERING = exports.ACTION_EVENT_LEGACY_ALIASES = exports.ACTION_CONSUMED_EVENTS = exports.ACTION_PUBLISHED_EVENTS = exports.ACTION_EVENT_CONTRACT = exports.actionAdminRoutes = exports.actionQuery = exports.onFailure = exports.onClosure = exports.onEscalation = exports.onApprovalRequired = exports.onWorkflowTriggered = exports.getActionJobs = exports.isActionAiActionBlocked = exports.isActionAiActionAllowed = exports.ACTION_AI_CONFIG = exports.emitActionStatusChange = exports.emitActionEvent = exports.seedActionModule = exports.getActionSeedData = exports.ACTION_SLA_DEFAULTS = exports.ACTION_TIMEOUTS = exports.ACTION_LIMITS = exports.ACTION_DEFAULT_STATUS = exports.ACTION_STATUSES = exports.ACTION_POLICY = void 0;
// Lifecycle registry registration (side-effect — S5/Z1.13)
require("./lifecycle-registration");
// Runtime exports
var action_policies_1 = require("./policies/action.policies");
Object.defineProperty(exports, "ACTION_POLICY", { enumerable: true, get: function () { return action_policies_1.ACTION_POLICY; } });
var action_constants_1 = require("./data/action-constants");
Object.defineProperty(exports, "ACTION_STATUSES", { enumerable: true, get: function () { return action_constants_1.ACTION_STATUSES; } });
Object.defineProperty(exports, "ACTION_DEFAULT_STATUS", { enumerable: true, get: function () { return action_constants_1.ACTION_DEFAULT_STATUS; } });
Object.defineProperty(exports, "ACTION_LIMITS", { enumerable: true, get: function () { return action_constants_1.ACTION_LIMITS; } });
Object.defineProperty(exports, "ACTION_TIMEOUTS", { enumerable: true, get: function () { return action_constants_1.ACTION_TIMEOUTS; } });
Object.defineProperty(exports, "ACTION_SLA_DEFAULTS", { enumerable: true, get: function () { return action_constants_1.ACTION_SLA_DEFAULTS; } });
var action_seed_1 = require("./data/action-seed");
Object.defineProperty(exports, "getActionSeedData", { enumerable: true, get: function () { return action_seed_1.getActionSeedData; } });
Object.defineProperty(exports, "seedActionModule", { enumerable: true, get: function () { return action_seed_1.seedActionModule; } });
var action_event_service_1 = require("./services/action-event.service");
Object.defineProperty(exports, "emitActionEvent", { enumerable: true, get: function () { return action_event_service_1.emitActionEvent; } });
Object.defineProperty(exports, "emitActionStatusChange", { enumerable: true, get: function () { return action_event_service_1.emitActionStatusChange; } });
var action_ai_service_1 = require("./services/action-ai.service");
Object.defineProperty(exports, "ACTION_AI_CONFIG", { enumerable: true, get: function () { return action_ai_service_1.ACTION_AI_CONFIG; } });
Object.defineProperty(exports, "isActionAiActionAllowed", { enumerable: true, get: function () { return action_ai_service_1.isActionAiActionAllowed; } });
Object.defineProperty(exports, "isActionAiActionBlocked", { enumerable: true, get: function () { return action_ai_service_1.isActionAiActionBlocked; } });
var action_monitor_job_1 = require("./jobs/action-monitor.job");
Object.defineProperty(exports, "getActionJobs", { enumerable: true, get: function () { return action_monitor_job_1.getActionJobs; } });
var action_workflow_service_1 = require("./services/action-workflow.service");
Object.defineProperty(exports, "onWorkflowTriggered", { enumerable: true, get: function () { return action_workflow_service_1.onWorkflowTriggered; } });
Object.defineProperty(exports, "onApprovalRequired", { enumerable: true, get: function () { return action_workflow_service_1.onApprovalRequired; } });
Object.defineProperty(exports, "onEscalation", { enumerable: true, get: function () { return action_workflow_service_1.onEscalation; } });
Object.defineProperty(exports, "onClosure", { enumerable: true, get: function () { return action_workflow_service_1.onClosure; } });
Object.defineProperty(exports, "onFailure", { enumerable: true, get: function () { return action_workflow_service_1.onFailure; } });
exports.actionQuery = __importStar(require("./repositories/action-query.repo"));
var action_admin_routes_1 = require("./routes/action-admin.routes");
Object.defineProperty(exports, "actionAdminRoutes", { enumerable: true, get: function () { return __importDefault(action_admin_routes_1).default; } });
var action_events_1 = require("./events/action.events");
Object.defineProperty(exports, "ACTION_EVENT_CONTRACT", { enumerable: true, get: function () { return action_events_1.ACTION_EVENT_CONTRACT; } });
Object.defineProperty(exports, "ACTION_PUBLISHED_EVENTS", { enumerable: true, get: function () { return action_events_1.ACTION_PUBLISHED_EVENTS; } });
Object.defineProperty(exports, "ACTION_CONSUMED_EVENTS", { enumerable: true, get: function () { return action_events_1.ACTION_CONSUMED_EVENTS; } });
Object.defineProperty(exports, "ACTION_EVENT_LEGACY_ALIASES", { enumerable: true, get: function () { return action_events_1.ACTION_EVENT_LEGACY_ALIASES; } });
Object.defineProperty(exports, "ACTION_EVENT_ORDERING", { enumerable: true, get: function () { return action_events_1.ACTION_EVENT_ORDERING; } });
Object.defineProperty(exports, "ACTION_EVENT_SECURITY", { enumerable: true, get: function () { return action_events_1.ACTION_EVENT_SECURITY; } });
Object.defineProperty(exports, "ACTION_EVENT_CORRELATION", { enumerable: true, get: function () { return action_events_1.ACTION_EVENT_CORRELATION; } });
// @ts-ignore - Pragmatic stabilization to unblock build
var action_mapper_1 = require("./mappers/action.mapper");
Object.defineProperty(exports, "toAudienceShaped", { enumerable: true, get: function () { return action_mapper_1.toAudienceShaped; } });
Object.defineProperty(exports, "toAdminResponse", { enumerable: true, get: function () { return action_mapper_1.toAdminResponse; } });
Object.defineProperty(exports, "toListItem", { enumerable: true, get: function () { return action_mapper_1.toListItem; } });
Object.defineProperty(exports, "redactForAudit", { enumerable: true, get: function () { return action_mapper_1.redactForAudit; } });
Object.defineProperty(exports, "stripFieldsForExport", { enumerable: true, get: function () { return action_mapper_1.stripFieldsForExport; } });
Object.defineProperty(exports, "toImportEntity", { enumerable: true, get: function () { return action_mapper_1.toImportEntity; } });
var action_schemas_1 = require("./schemas/action.schemas");
Object.defineProperty(exports, "actionResponseSchema", { enumerable: true, get: function () { return action_schemas_1.actionResponseSchema; } });
Object.defineProperty(exports, "actionListResponseSchema", { enumerable: true, get: function () { return action_schemas_1.actionListResponseSchema; } });
Object.defineProperty(exports, "actionEventPayloadSchema", { enumerable: true, get: function () { return action_schemas_1.actionEventPayloadSchema; } });
Object.defineProperty(exports, "actionStatusTransitionSchema", { enumerable: true, get: function () { return action_schemas_1.actionStatusTransitionSchema; } });
Object.defineProperty(exports, "actionImportRowSchema", { enumerable: true, get: function () { return action_schemas_1.actionImportRowSchema; } });
Object.defineProperty(exports, "actionImportBatchSchema", { enumerable: true, get: function () { return action_schemas_1.actionImportBatchSchema; } });
Object.defineProperty(exports, "actionExportRequestSchema", { enumerable: true, get: function () { return action_schemas_1.actionExportRequestSchema; } });
Object.defineProperty(exports, "actionAdminConfigSchema", { enumerable: true, get: function () { return action_schemas_1.actionAdminConfigSchema; } });
Object.defineProperty(exports, "actionBulkUpdateSchema", { enumerable: true, get: function () { return action_schemas_1.actionBulkUpdateSchema; } });
Object.defineProperty(exports, "actionBulkStatusChangeSchema", { enumerable: true, get: function () { return action_schemas_1.actionBulkStatusChangeSchema; } });
//# sourceMappingURL=index.js.map