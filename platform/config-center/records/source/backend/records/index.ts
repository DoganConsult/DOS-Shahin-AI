// ── Records Module — Barrel Export ──────────────────────────────
// Runtime exports
export { RECORDS_POLICY } from './policies/records.policies';
export { RECORDS_STATUSES, RECORDS_DEFAULT_STATUS, RECORDS_LIMITS, RECORDS_TIMEOUTS, RECORDS_SLA_DEFAULTS } from './data/records-constants';
export { getRecordsSeedData, seedRecordsModule } from './data/records-seed';
export { emitRecordsEvent, emitRecordsStatusChange } from './services/records-event.service';
export { RECORDS_AI_CONFIG, isRecordsAiActionAllowed, isRecordsAiActionBlocked } from './services/records-ai.service';
export { getRecordsJobs } from './jobs/records-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/records-workflow.service';
export * as recordsQuery from './repositories/records-query.repo';
export { default as recordsAdminRoutes } from './routes/records-admin.routes';
export { RECORDS_EVENT_CONTRACT, RECORDS_PUBLISHED_EVENTS, RECORDS_CONSUMED_EVENTS, RECORDS_EVENT_LEGACY_ALIASES, RECORDS_EVENT_ORDERING, RECORDS_EVENT_SECURITY, RECORDS_EVENT_CORRELATION } from './events/records.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/records.mapper';
export { recordsResponseSchema, recordsListResponseSchema, recordsEventPayloadSchema, recordsStatusTransitionSchema, recordsImportRowSchema, recordsImportBatchSchema, recordsExportRequestSchema, recordsAdminConfigSchema, recordsBulkUpdateSchema, recordsBulkStatusChangeSchema } from './schemas/records.schemas';

// Type exports
export type { RecordsStatus, RecordsEventPayload, RecordsSource, RecordsStatusReason } from './types/records.types';
export type { RecordsCreateDTO, RecordsUpdateDTO, RecordsResponseDTO, RecordsListItemDTO, RecordsDetailDTO, RecordsAdminDTO, RecordsImportDTO, RecordsExportDTO, RecordsSearchResultDTO, RecordsAuditDTO, RecordsBulkOperationDTO } from './types/records.dto';
export type { RecordsWorkflowContext } from './services/records-workflow.service';
