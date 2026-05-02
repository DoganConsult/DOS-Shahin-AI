// ── Inbox Module — Barrel Export ──────────────────────────────
// Runtime exports
export { INBOX_POLICY } from './policies/inbox.policies';
export { INBOX_STATUSES, INBOX_DEFAULT_STATUS, INBOX_LIMITS, INBOX_TIMEOUTS, INBOX_SLA_DEFAULTS } from './data/inbox-constants';
export { getInboxSeedData, seedInboxModule } from './data/inbox-seed';
export { emitInboxEvent, emitInboxStatusChange } from './services/inbox-event.service';
export { INBOX_AI_CONFIG, isInboxAiActionAllowed, isInboxAiActionBlocked } from './services/inbox-ai.service';
export { getInboxJobs } from './jobs/inbox-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/inbox-workflow.service';
export * as inboxQuery from './repositories/inbox-query.repo';
export { default as inboxAdminRoutes } from './routes/inbox-admin.routes';
export { INBOX_EVENT_CONTRACT, INBOX_PUBLISHED_EVENTS, INBOX_CONSUMED_EVENTS, INBOX_EVENT_LEGACY_ALIASES, INBOX_EVENT_ORDERING, INBOX_EVENT_SECURITY, INBOX_EVENT_CORRELATION } from './events/inbox.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/inbox.mapper';
export { inboxResponseSchema, inboxListResponseSchema, inboxEventPayloadSchema, inboxStatusTransitionSchema, inboxImportRowSchema, inboxImportBatchSchema, inboxExportRequestSchema, inboxAdminConfigSchema, inboxBulkUpdateSchema, inboxBulkStatusChangeSchema } from './schemas/inbox.schemas';

// Type exports
export type { InboxStatus, InboxEventPayload, InboxSource, InboxStatusReason } from './types/inbox.types';
export type { InboxCreateDTO, InboxUpdateDTO, InboxResponseDTO, InboxListItemDTO, InboxDetailDTO, InboxAdminDTO, InboxImportDTO, InboxExportDTO, InboxSearchResultDTO, InboxAuditDTO, InboxBulkOperationDTO } from './types/inbox.dto';
export type { InboxWorkflowContext } from './services/inbox-workflow.service';
