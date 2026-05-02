// ── Governance Module — Barrel Export ──────────────────────────────

// Lifecycle registry registration (side-effect)
import './lifecycle-registration';

// Runtime exports
export { GOVERNANCE_POLICY } from './policies/governance.policies';
export { GOVERNANCE_STATUSES, GOVERNANCE_DEFAULT_STATUS, GOVERNANCE_LIMITS, GOVERNANCE_TIMEOUTS, GOVERNANCE_SLA_DEFAULTS } from './data/governance-constants';
export { getGovernanceSeedData, seedGovernanceModule } from './data/governance-seed';
export { emitGovernanceEvent, emitGovernanceStatusChange } from './services/governance/governance-event.service';
export { GOVERNANCE_AI_CONFIG, isGovernanceAiActionAllowed, isGovernanceAiActionBlocked } from './services/governance/governance-ai.service';
export { getGovernanceJobs } from './jobs/governance-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/governance/governance-workflow.service';
export * as governanceQuery from './repositories/governance-query.repo';
export { default as governanceAdminRoutes } from './routes/governance/governance-admin.routes';
export { GOVERNANCE_EVENT_CONTRACT, GOVERNANCE_PUBLISHED_EVENTS, GOVERNANCE_CONSUMED_EVENTS, GOVERNANCE_EVENT_LEGACY_ALIASES, GOVERNANCE_EVENT_ORDERING, GOVERNANCE_EVENT_SECURITY, GOVERNANCE_EVENT_CORRELATION } from './events/governance.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/governance.mapper';
export { governanceResponseSchema, governanceListResponseSchema, governanceEventPayloadSchema, governanceStatusTransitionSchema, governanceImportRowSchema, governanceImportBatchSchema, governanceExportRequestSchema, governanceAdminConfigSchema, governanceBulkUpdateSchema, governanceBulkStatusChangeSchema } from './schemas/governance.schemas';

// Contracts
export type { GovernanceBodyContract, CommitteeMembershipContract, GovernanceResponsibilityContract, RaciEntryContract, GovernanceOversightContract, GovernanceDiagnosticsContract, GovernanceCharterContract, BoardPackContract } from './contracts/governance.contracts';

// Diagnostics
export { getGovernanceDiagnostics } from './diagnostics/governance-diagnostics.service';

// Dashboard
export { getGovernanceDashboard, getCommitteeManagementSummary, getResponsibilityAssignmentSummary } from './services/governance/governance-dashboard.service';
export type { GovernanceDashboardSummary, CommitteeSummary, AssignmentSummary } from './services/governance/governance-dashboard.service';

// Lifecycle
export { GOVERNANCE_BODY_STATES, GOVERNANCE_BODY_TRANSITIONS, GOVERNANCE_DECISION_STATES, GOVERNANCE_DECISION_TRANSITIONS } from './workflows/governance-lifecycle';
export type { GovernanceBodyState, GovernanceDecisionState } from './workflows/governance-lifecycle';

// Type exports
export type { GovernanceStatus, GovernanceEventPayload, GovernanceSource, GovernanceStatusReason } from '@dos/types/governance';
export type { GovernanceCreateDTO, GovernanceUpdateDTO, GovernanceResponseDTO, GovernanceListItemDTO, GovernanceDetailDTO, GovernanceAdminDTO, GovernanceImportDTO, GovernanceExportDTO, GovernanceSearchResultDTO, GovernanceAuditDTO, GovernanceBulkOperationDTO } from './types/governance.dto';
export type { GovernanceWorkflowContext } from './services/governance/governance-workflow.service';
