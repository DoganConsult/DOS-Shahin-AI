// ── Privacy Module — Barrel Export ──────────────────────────────
// Runtime exports
export { PRIVACY_POLICY } from './policies/privacy.policies';
export { PRIVACY_STATUSES, PRIVACY_DEFAULT_STATUS, PRIVACY_LIMITS, PRIVACY_TIMEOUTS, PRIVACY_SLA_DEFAULTS } from './data/privacy-constants';
export { getPrivacySeedData, seedPrivacyModule } from './data/privacy-seed';
export { emitPrivacyEvent, emitPrivacyStatusChange } from './services/privacy-event.service';
export { PRIVACY_AI_CONFIG, isPrivacyAiActionAllowed, isPrivacyAiActionBlocked } from './services/privacy-ai.service';
export { getPrivacyJobs } from './jobs/privacy-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/privacy-workflow.service';
export * as privacyQuery from './repositories/privacy-query.repo';
export { default as privacyAdminRoutes } from './routes/privacy-admin.routes';
export { default as dataExportRoutes } from './routes/data-export.routes';
export { exportTenantData, getExportCatalog } from './services/tenant-data-export.service';
export { PRIVACY_EVENT_CONTRACT, PRIVACY_PUBLISHED_EVENTS, PRIVACY_CONSUMED_EVENTS, PRIVACY_EVENT_LEGACY_ALIASES, PRIVACY_EVENT_ORDERING, PRIVACY_EVENT_SECURITY, PRIVACY_EVENT_CORRELATION } from './events/privacy.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/privacy.mapper';
export { privacyResponseSchema, privacyListResponseSchema, privacyEventPayloadSchema, privacyStatusTransitionSchema, privacyImportRowSchema, privacyImportBatchSchema, privacyExportRequestSchema, privacyAdminConfigSchema, privacyBulkUpdateSchema, privacyBulkStatusChangeSchema } from './schemas/privacy.schemas';

// Type exports
export type { PrivacyStatus, PrivacyEventPayload, PrivacySource, PrivacyStatusReason } from '@dos/types/privacy';
export type { PrivacyCreateDTO, PrivacyUpdateDTO, PrivacyResponseDTO, PrivacyListItemDTO, PrivacyDetailDTO, PrivacyAdminDTO, PrivacyImportDTO, PrivacyExportDTO, PrivacySearchResultDTO, PrivacyAuditDTO, PrivacyBulkOperationDTO } from './types/privacy.dto';
export type { PrivacyWorkflowContext } from './services/privacy-workflow.service';
