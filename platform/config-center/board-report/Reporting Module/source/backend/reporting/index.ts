// ── Reporting Module — Barrel Export ──────────────────────────────
// Runtime exports
export { REPORTING_POLICY } from './policies/reporting.policies';
export { REPORTING_STATUSES, REPORTING_DEFAULT_STATUS, REPORTING_LIMITS, REPORTING_TIMEOUTS, REPORTING_SLA_DEFAULTS } from './data/reporting-constants';
export { getReportingSeedData, seedReportingModule } from './data/reporting-seed';
export { emitReportingEvent, emitReportingStatusChange } from './services/reporting/reporting-event.service';
export { REPORTING_AI_CONFIG, isReportingAiActionAllowed, isReportingAiActionBlocked } from './services/reporting/reporting-ai.service';
export { getReportingJobs } from './jobs/reporting-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/reporting/reporting-workflow.service';
export * as reportingQuery from './repositories/reporting-query.repo';
export { default as reportingAdminRoutes } from './routes/reporting/reporting-admin.routes';
export { REPORTING_EVENT_CONTRACT, REPORTING_PUBLISHED_EVENTS, REPORTING_CONSUMED_EVENTS, REPORTING_EVENT_LEGACY_ALIASES, REPORTING_EVENT_ORDERING, REPORTING_EVENT_SECURITY, REPORTING_EVENT_CORRELATION } from './events/reporting.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/reporting.mapper';
export { reportingResponseSchema, reportingListResponseSchema, reportingEventPayloadSchema, reportingStatusTransitionSchema, reportingImportRowSchema, reportingImportBatchSchema, reportingExportRequestSchema, reportingAdminConfigSchema, reportingBulkUpdateSchema, reportingBulkStatusChangeSchema } from './schemas/reporting.schemas';

// Type exports
export type { ReportingStatus, ReportingEventPayload, ReportingSource, ReportingStatusReason } from '@dos/types/reporting';
export type { ReportingCreateDTO, ReportingUpdateDTO, ReportingResponseDTO, ReportingListItemDTO, ReportingDetailDTO, ReportingAdminDTO, ReportingImportDTO, ReportingExportDTO, ReportingSearchResultDTO, ReportingAuditDTO, ReportingBulkOperationDTO } from './types/reporting.dto';
export type { ReportingWorkflowContext } from './services/reporting/reporting-workflow.service';
