// ── Issues Module — Barrel Export ──────────────────────────────
// Runtime exports
export { ISSUES_POLICY } from './policies/issues.policies';
export { ISSUES_STATUSES, ISSUES_DEFAULT_STATUS, ISSUES_LIMITS, ISSUES_TIMEOUTS, ISSUES_SLA_DEFAULTS } from './data/issues-constants';
export { getIssuesSeedData, seedIssuesModule } from './data/issues-seed';
export { emitIssuesEvent, emitIssuesStatusChange } from './services/issues-event.service';
export { ISSUES_AI_CONFIG, isIssuesAiActionAllowed, isIssuesAiActionBlocked } from './services/issues-ai.service';
export { getIssuesJobs } from './jobs/issues-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/issues-workflow.service';
export * as issuesQuery from './repositories/issues-query.repo';
export { default as issuesAdminRoutes } from './routes/issues-admin.routes';
export { ISSUES_EVENT_CONTRACT, ISSUES_PUBLISHED_EVENTS, ISSUES_CONSUMED_EVENTS, ISSUES_EVENT_LEGACY_ALIASES, ISSUES_EVENT_ORDERING, ISSUES_EVENT_SECURITY, ISSUES_EVENT_CORRELATION } from './events/issues.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/issues.mapper';
export { issuesResponseSchema, issuesListResponseSchema, issuesEventPayloadSchema, issuesStatusTransitionSchema, issuesImportRowSchema, issuesImportBatchSchema, issuesExportRequestSchema, issuesAdminConfigSchema, issuesBulkUpdateSchema, issuesBulkStatusChangeSchema } from './schemas/issues.schemas';

// Type exports
export type { IssuesStatus, IssuesEventPayload, IssuesSource, IssuesStatusReason } from './types/issues.types';
export type { IssuesCreateDTO, IssuesUpdateDTO, IssuesResponseDTO, IssuesListItemDTO, IssuesDetailDTO, IssuesAdminDTO, IssuesImportDTO, IssuesExportDTO, IssuesSearchResultDTO, IssuesAuditDTO, IssuesBulkOperationDTO } from './types/issues.dto';
export type { IssuesWorkflowContext } from './services/issues-workflow.service';
