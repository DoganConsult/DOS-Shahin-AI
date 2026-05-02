// ── Policy Module -- Barrel Export ──────────────────────────────

// Lifecycle registry registration (side-effect -- S5/Z1.13)
import './lifecycle-registration';

// Runtime exports
export { POLICY_POLICY } from './policies/policy.policies';
export { POLICY_STATUSES, POLICY_DEFAULT_STATUS, POLICY_LIMITS, POLICY_TIMEOUTS, POLICY_SLA_DEFAULTS } from './data/policy-constants';
export { getPolicySeedData, seedPolicyModule } from './data/policy-seed';
export { emitPolicyEvent, emitPolicyStatusChange } from './services/policy/policy-event.service';
export { POLICY_AI_CONFIG, isPolicyAiActionAllowed, isPolicyAiActionBlocked } from './services/policy/policy-ai.service';
export { getPolicyJobs } from './jobs/policy-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/policy/policy-workflow.service';
export * as policyQuery from './repositories/policy-query.repo';
export { default as policyAdminRoutes } from './routes/policy-admin.routes';
export { POLICY_EVENT_CONTRACT, POLICY_PUBLISHED_EVENTS, POLICY_CONSUMED_EVENTS, POLICY_EVENT_LEGACY_ALIASES, POLICY_EVENT_ORDERING, POLICY_EVENT_SECURITY, POLICY_EVENT_CORRELATION } from './events/policy.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/policy.mapper';
export { policyResponseSchema, policyListResponseSchema, policyEventPayloadSchema, policyStatusTransitionSchema, policyImportRowSchema, policyImportBatchSchema, policyExportRequestSchema, policyAdminConfigSchema, policyBulkUpdateSchema, policyBulkStatusChangeSchema } from './schemas/policy.schemas';

// Diagnostics exports
export { runDiagnostics, getPolicyDiagnostics } from './diagnostics/policy-diagnostics.service';
export type { DiagnosticsResult, DiagnosticsCheck } from './diagnostics/policy-diagnostics.service';

// Contract exports
export type {
  PolicyListParams,
  PolicyListResponse,
  PolicyDetailResponse,
  PolicyMutationResponse,
  PolicyApiResponse,
  PolicyContract,
  PolicyTransitionRequest,
  PolicyTransitionResult,
  PolicyImportRow,
  PolicyImportContract,
  PolicyExportContract,
  PolicyErrorResponse,
  PolicyDashboardWidgetData,
  PolicyAcknowledgementContract,
  PolicyExceptionContract,
  PolicyReviewCycleContract,
} from './contracts/policy.contract';

// Event subscriber exports
export { getSubscriptionHandlers, subscribeAll, registerPolicyEventSubscribers } from './events/policy.subscribers';

// Type exports
export type { PolicyStatus, PolicyEventPayload, PolicySource, PolicyStatusReason } from './types/policy.types';
export type { PolicyCreateDTO, PolicyUpdateDTO, PolicyResponseDTO, PolicyListItemDTO, PolicyDetailDTO, PolicyAdminDTO, PolicyImportDTO, PolicyExportDTO, PolicySearchResultDTO, PolicyAuditDTO, PolicyBulkOperationDTO } from './types/policy.dto';
export type { PolicyWorkflowContext } from './services/policy/policy-workflow.service';
