// ── Ai Module — Barrel Export ──────────────────────────────
// Lifecycle registry registration (side-effect)
import './lifecycle-registration';
// Runtime exports
export { AI_POLICY } from './policies/ai.policies';
export { AI_STATUSES, AI_DEFAULT_STATUS, AI_LIMITS, AI_TIMEOUTS, AI_SLA_DEFAULTS } from './data/ai-constants';
export { getAiSeedData, seedAiModule } from './data/ai-seed';
export { emitAiEvent, emitAiStatusChange } from './services/workflow/ai-event.service';
export { AI_AI_CONFIG, isAiAiActionAllowed, isAiAiActionBlocked } from './services/orchestration/ai-ai.service';
export { getAiJobs } from './jobs/ai-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/workflow/ai-workflow.service';
export * as aiQuery from './repositories/ai-query.repo';
export { default as aiAdminRoutes } from './routes/admin/ai-admin.routes';
export { AI_EVENT_CONTRACT, AI_PUBLISHED_EVENTS, AI_CONSUMED_EVENTS, AI_EVENT_LEGACY_ALIASES, AI_EVENT_ORDERING, AI_EVENT_SECURITY, AI_EVENT_CORRELATION } from './events/ai.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/ai.mapper';
export { aiResponseSchema, aiListResponseSchema, aiEventPayloadSchema, aiStatusTransitionSchema, aiImportRowSchema, aiImportBatchSchema, aiExportRequestSchema, aiAdminConfigSchema, aiBulkUpdateSchema, aiBulkStatusChangeSchema } from './schemas/ai.schemas';
// Diagnostics
export { getAiDiagnosticsSnapshot, getFailedRunAnalysis, getBlockedToolInvocations, getQueueThroughputDiagnostics } from './diagnostics/ai-diagnostics.service';
// Dashboard
export { getAiDashboard, getAiCostUsage } from './services/core/ai-dashboard.service.js';
// Code Search
export { executeCodeSearch, getCodeSearchHealthStatus, listEngineRegistry, listSurfaceRegistry, getCodeSearchDashboard } from './services/code-search/code-search.service';
//# sourceMappingURL=index.js.map