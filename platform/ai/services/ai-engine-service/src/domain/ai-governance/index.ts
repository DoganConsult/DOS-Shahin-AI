// ── AiGovernance Module — Barrel Export ──────────────────────────────

// Lifecycle registry registration (side-effect)
import './lifecycle-registration';

// Runtime exports
export { AI_GOVERNANCE_POLICY } from './policies/ai-governance.policies';
export { AI_GOVERNANCE_STATUSES, AI_GOVERNANCE_DEFAULT_STATUS, AI_GOVERNANCE_LIMITS, AI_GOVERNANCE_TIMEOUTS, AI_GOVERNANCE_SLA_DEFAULTS } from './data/ai-governance-constants';
export { getAiGovernanceSeedData, seedAiGovernanceModule } from './data/ai-governance-seed';
export { emitAiGovernanceEvent, emitAiGovernanceStatusChange } from './services/ai/operations/ai-governance-event.service';
export { AI_GOVERNANCE_AI_CONFIG, isAiGovernanceAiActionAllowed, isAiGovernanceAiActionBlocked } from './services/ai/monitoring/ai-governance-ai.service';
export { getAiGovernanceJobs } from './jobs/ai-governance-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/ai/operations/ai-governance-workflow.service';
export * as aiGovernanceQuery from './repositories/ai-governance-query.repo';
export { default as aiGovernanceAdminRoutes } from './routes/ai/ai-governance-admin.routes';
export { AI_GOVERNANCE_EVENT_CONTRACT, AI_GOVERNANCE_PUBLISHED_EVENTS, AI_GOVERNANCE_CONSUMED_EVENTS, AI_GOVERNANCE_EVENT_LEGACY_ALIASES, AI_GOVERNANCE_EVENT_ORDERING, AI_GOVERNANCE_EVENT_SECURITY, AI_GOVERNANCE_EVENT_CORRELATION } from './events/ai-governance.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/ai-governance.mapper';
export { ai_governanceResponseSchema, ai_governanceListResponseSchema, ai_governanceEventPayloadSchema, ai_governanceStatusTransitionSchema, ai_governanceImportRowSchema, ai_governanceImportBatchSchema, ai_governanceExportRequestSchema, ai_governanceAdminConfigSchema, ai_governanceBulkUpdateSchema, ai_governanceBulkStatusChangeSchema } from './schemas/ai-governance.schemas';

// Contracts
export type { AiSystemRegistryContract, ModelCardContract, AiPolicyContract, AiDpiaContract, AiSupplyChainContract, AiGovernanceDiagnosticsContract, AiGovernanceAdminSettingsContract, AiGovernanceListParams, AiGovernanceListResponse, AiGovernanceDetailResponse, AiGovernanceMutationResponse } from './contracts/ai-governance.contract';

// Diagnostics
export { getAiGovernanceDiagnostics, getRegistryIntegrityDiagnostics, getMissingDocumentationDiagnostics } from './diagnostics/ai-governance-diagnostics.service';
export type { RegistryIntegrityIssue, MissingDocDiagnostic } from './diagnostics/ai-governance-diagnostics.service';

// Dashboard
export { getAiGovernanceDashboard, getAiDpiaStatusSummary } from './services/ai/operations/ai-governance-dashboard.service';
export type { AiGovernanceDashboardSummary, RiskBreakdown, DashboardActivityItem, DpiaSummaryItem } from './services/ai/operations/ai-governance-dashboard.service';

// Lifecycle
export { AI_MODEL_GOVERNANCE_STATES, AI_MODEL_GOVERNANCE_TRANSITIONS, AI_RISK_ASSESSMENT_STATES, AI_RISK_ASSESSMENT_TRANSITIONS } from './workflows/ai-governance-lifecycle';
export type { AiModelGovernanceState, AiRiskAssessmentState } from './workflows/ai-governance-lifecycle';

// Type exports
export type { AiGovernanceStatus, AiGovernanceEventPayload, AiGovernanceSource, AiGovernanceStatusReason } from './types/ai-governance.types';
export type { AiGovernanceCreateDTO, AiGovernanceUpdateDTO, AiGovernanceResponseDTO, AiGovernanceListItemDTO, AiGovernanceDetailDTO, AiGovernanceAdminDTO, AiGovernanceImportDTO, AiGovernanceExportDTO, AiGovernanceSearchResultDTO, AiGovernanceAuditDTO, AiGovernanceBulkOperationDTO } from './types/ai-governance.dto';
export type { AiGovernanceWorkflowContext } from './services/ai/operations/ai-governance-workflow.service';
