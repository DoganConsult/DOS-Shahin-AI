// ── Remediation Module — Barrel Export ──────────────────────────────
// Runtime exports
export { REMEDIATION_POLICY } from './policies/remediation.policies';
export { REMEDIATION_STATUSES, REMEDIATION_DEFAULT_STATUS, REMEDIATION_LIMITS, REMEDIATION_TIMEOUTS, REMEDIATION_SLA_DEFAULTS } from './data/remediation-constants';
export { getRemediationSeedData, seedRemediationModule } from './data/remediation-seed';
export { emitRemediationEvent, emitRemediationStatusChange } from './services/remediation-event.service';
export { REMEDIATION_AI_CONFIG, isRemediationAiActionAllowed, isRemediationAiActionBlocked } from './services/remediation-ai.service';
export { getRemediationJobs } from './jobs/remediation-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/remediation-workflow.service';
export * as remediationQuery from './repositories/remediation-query.repo';
export { default as remediationAdminRoutes } from './routes/remediation-admin.routes';
export { REMEDIATION_EVENT_CONTRACT, REMEDIATION_PUBLISHED_EVENTS, REMEDIATION_CONSUMED_EVENTS, REMEDIATION_EVENT_LEGACY_ALIASES, REMEDIATION_EVENT_ORDERING, REMEDIATION_EVENT_SECURITY, REMEDIATION_EVENT_CORRELATION } from './events/remediation.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/remediation.mapper';
export { remediationResponseSchema, remediationListResponseSchema, remediationEventPayloadSchema, remediationStatusTransitionSchema, remediationImportRowSchema, remediationImportBatchSchema, remediationExportRequestSchema, remediationAdminConfigSchema, remediationBulkUpdateSchema, remediationBulkStatusChangeSchema } from './schemas/remediation.schemas';

// Type exports
export type { RemediationStatus, RemediationEventPayload, RemediationSource, RemediationStatusReason } from './types/remediation.types';
export type { RemediationCreateDTO, RemediationUpdateDTO, RemediationResponseDTO, RemediationListItemDTO, RemediationDetailDTO, RemediationAdminDTO, RemediationImportDTO, RemediationExportDTO, RemediationSearchResultDTO, RemediationAuditDTO, RemediationBulkOperationDTO } from './types/remediation.dto';
export type { RemediationWorkflowContext } from './services/remediation-workflow.service';
