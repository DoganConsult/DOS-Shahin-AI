// ── Risk Module — Barrel Export ──────────────────────────────

// Lifecycle registry registration (side-effect — S5/Z1.13)
import './lifecycle-registration';

// Runtime exports (Law 2: security metadata is data-driven via ModuleManifest, not per-file)
export { RISK_POLICY } from './policies/risk.policies';
export { RISK_STATUSES, RISK_DEFAULT_STATUS, RISK_LIMITS, RISK_TIMEOUTS, RISK_SLA_DEFAULTS } from './data/risk-constants';
export { getRiskSeedData, seedRiskModule } from './data/risk-seed';
export { emitRiskEvent, emitRiskStatusChange } from './services/integration/risk-event.service';
export { RISK_AI_CONFIG, isRiskAiActionAllowed, isRiskAiActionBlocked } from './services/integration/risk-ai.service';
export { getRiskJobs } from './jobs/risk-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/workflow/risk-workflow.service';
export { 
  createRiskReview, 
  submitForApproval, 
  processApprovalDecision,
  getPendingReviews,
  getPendingApprovals
} from './services/core/risk-review-approval.service';
export * as riskQuery from './repositories/risk-query.repo';
export { default as riskAdminRoutes } from './routes/risk-admin.routes';
export { default as riskReviewApprovalRoutes } from './routes/risk-review-approval.routes';
export { RISK_EVENT_CONTRACT, RISK_PUBLISHED_EVENTS, RISK_CONSUMED_EVENTS, RISK_EVENT_LEGACY_ALIASES, RISK_EVENT_ORDERING, RISK_EVENT_SECURITY, RISK_EVENT_CORRELATION } from './events/risk.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/risk.mapper';
export { riskResponseSchema, riskListResponseSchema, riskEventPayloadSchema, riskStatusTransitionSchema, riskImportRowSchema, riskImportBatchSchema, riskExportRequestSchema, riskAdminConfigSchema, riskBulkUpdateSchema, riskBulkStatusChangeSchema } from './schemas/risk.schemas';

// Type exports
export type { RiskStatus, RiskEventPayload, RiskSource, RiskStatusReason } from './types/risk.types';
export type { RiskCreateDTO, RiskUpdateDTO, RiskResponseDTO, RiskListItemDTO, RiskDetailDTO, RiskAdminDTO, RiskImportDTO, RiskExportDTO, RiskSearchResultDTO, RiskAuditDTO, RiskBulkOperationDTO } from './types/risk.dto';
export type { RiskWorkflowContext } from './services/workflow/risk-workflow.service';
