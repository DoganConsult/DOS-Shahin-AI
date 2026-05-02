// ── Audit Module — Barrel Export ──────────────────────────────
// Runtime exports
export { AUDIT_POLICY } from './policies/audit.policies';
export { AUDIT_STATUSES, AUDIT_DEFAULT_STATUS, AUDIT_LIMITS, AUDIT_TIMEOUTS, AUDIT_SLA_DEFAULTS } from './data/audit-constants';
export { getAuditSeedData, seedAuditModule } from './data/audit-seed';
export { emitAuditEvent, emitAuditStatusChange } from './services/audit/core/audit-event.service';
export { AUDIT_AI_CONFIG, isAuditAiActionAllowed, isAuditAiActionBlocked } from './services/audit/operations/audit-ai.service';
export { getAuditJobs } from './jobs/audit-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/audit/core/audit-workflow.service';
export * as auditQuery from './repositories/audit-query.repo';
export { default as auditAdminRoutes } from './routes/audit/audit-admin.routes';
export { AUDIT_EVENT_CONTRACT, AUDIT_PUBLISHED_EVENTS, AUDIT_CONSUMED_EVENTS, AUDIT_EVENT_LEGACY_ALIASES, AUDIT_EVENT_ORDERING, AUDIT_EVENT_SECURITY, AUDIT_EVENT_CORRELATION } from './events/audit.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/audit.mapper';
export { auditResponseSchema, auditListResponseSchema, auditEventPayloadSchema, auditStatusTransitionSchema, auditImportRowSchema, auditImportBatchSchema, auditExportRequestSchema, auditAdminConfigSchema, auditBulkUpdateSchema, auditBulkStatusChangeSchema } from './schemas/audit.schemas';

// Type exports
export type { AuditStatus, AuditEventPayload, AuditSource, AuditStatusReason } from './types/audit.types';
export type { AuditCreateDTO, AuditUpdateDTO, AuditResponseDTO, AuditListItemDTO, AuditDetailDTO, AuditAdminDTO, AuditImportDTO, AuditExportDTO, AuditSearchResultDTO, AuditAuditDTO, AuditBulkOperationDTO } from './types/audit.dto';
export type { AuditWorkflowContext } from './services/audit/core/audit-workflow.service';
