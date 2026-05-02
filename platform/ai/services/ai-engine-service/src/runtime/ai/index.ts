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

// Contracts
export type { AgentRunContract, AgentProposalContract, AgentRecommendationContract, AgentExplanationContract, ToolExecutionResultContract, PromptConfigContract, AiCostUsageContract, AiDiagnosticsContract, AiAdminSettingsContract, AiListParams, AiListResponse } from './contracts/ai.contracts';

// Diagnostics
export { getAiDiagnosticsSnapshot, getFailedRunAnalysis, getBlockedToolInvocations, getQueueThroughputDiagnostics } from './diagnostics/ai-diagnostics.service';
export type { AiDiagnosticsSnapshot, FailedRunAnalysis, BlockedToolInvocation } from './diagnostics/ai-diagnostics.service';

// Dashboard
export { getAiDashboard, getAiCostUsage } from './services/core/ai-dashboard.service.js';
export type { AiDashboardSummary, AgentUsageItem, RecentFailureItem, AiCostUsageResult } from './services/core/ai-dashboard.service.js';

// Type exports
export type { AiStatus, AiEventPayload, AiSource, AiStatusReason } from './types/ai.types';
export type { AiCreateDTO, AiUpdateDTO, AiResponseDTO, AiListItemDTO, AiDetailDTO, AiAdminDTO, AiImportDTO, AiExportDTO, AiSearchResultDTO, AiAuditDTO, AiBulkOperationDTO } from './types/ai.dto';
export type { AiWorkflowContext } from './services/workflow/ai-workflow.service';

// Code Search
export { executeCodeSearch, getCodeSearchHealthStatus, listEngineRegistry, listSurfaceRegistry, getCodeSearchDashboard } from './services/code-search/code-search.service';
export type { CodeSearchQueryInput, CodeSearchQueryResponse, CodeSearchHealthResponse, CodeSearchEngineRecord, CodeSearchSurfaceRecord, CodeSearchEngineCreateDTO, CodeSearchEngineUpdateDTO, CodeSearchSurfaceCreateDTO } from './types/code-search.types';
