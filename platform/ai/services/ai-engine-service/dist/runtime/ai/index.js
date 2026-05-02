// ── Ai Module — Barrel Export ──────────────────────────────
// Lifecycle registry registration (side-effect)
import './lifecycle-registration.js';
// Runtime exports
export { AI_POLICY } from './policies/ai.policies.js';
export { AI_STATUSES, AI_DEFAULT_STATUS, AI_LIMITS, AI_TIMEOUTS, AI_SLA_DEFAULTS } from './data/ai-constants.js';
export { getAiSeedData, seedAiModule } from './data/ai-seed.js';
export { emitAiEvent, emitAiStatusChange } from './services/workflow/ai-event.service.js';
export { AI_AI_CONFIG, isAiAiActionAllowed, isAiAiActionBlocked } from './services/orchestration/ai-ai.service.js';
export { getAiJobs } from './jobs/ai-monitor.job.js';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/workflow/ai-workflow.service.js';
export * as aiQuery from './repositories/ai-query.repo.js';
export { default as aiAdminRoutes } from './routes/admin/ai-admin.routes.js';
export { AI_EVENT_CONTRACT, AI_PUBLISHED_EVENTS, AI_CONSUMED_EVENTS, AI_EVENT_LEGACY_ALIASES, AI_EVENT_ORDERING, AI_EVENT_SECURITY, AI_EVENT_CORRELATION } from './events/ai.events.js';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/ai.mapper.js';
export { aiResponseSchema, aiListResponseSchema, aiEventPayloadSchema, aiStatusTransitionSchema, aiImportRowSchema, aiImportBatchSchema, aiExportRequestSchema, aiAdminConfigSchema, aiBulkUpdateSchema, aiBulkStatusChangeSchema } from './schemas/ai.schemas.js';
// Diagnostics
export { getAiDiagnosticsSnapshot, getFailedRunAnalysis, getBlockedToolInvocations, getQueueThroughputDiagnostics } from './diagnostics/ai-diagnostics.service.js';
// Dashboard
export { getAiDashboard, getAiCostUsage } from './services/core/ai-dashboard.service.js';
// Code Search
export { executeCodeSearch, getCodeSearchHealthStatus, listEngineRegistry, listSurfaceRegistry, getCodeSearchDashboard } from './services/code-search/code-search.service.js';
//# sourceMappingURL=index.js.map