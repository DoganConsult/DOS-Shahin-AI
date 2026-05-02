// ── Bcp Module — Barrel Export ──────────────────────────────
// Runtime exports
export { BCP_POLICY } from './policies/bcp.policies';
export { BCP_STATUSES, BCP_DEFAULT_STATUS, BCP_LIMITS, BCP_TIMEOUTS, BCP_SLA_DEFAULTS } from './data/bcp-constants';
export { getBcpSeedData, seedBcpModule } from './data/bcp-seed';
export { emitBcpEvent, emitBcpStatusChange } from './services/bcp-event.service';
export { BCP_AI_CONFIG, isBcpAiActionAllowed, isBcpAiActionBlocked } from './services/bcp-ai.service';
export { getBcpJobs } from './jobs/bcp-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/bcp-workflow.service';
export * as bcpQuery from './repositories/bcp-query.repo';
export { default as bcpAdminRoutes } from './routes/bcp-admin.routes';
export { BCP_EVENT_CONTRACT, BCP_PUBLISHED_EVENTS, BCP_CONSUMED_EVENTS, BCP_EVENT_LEGACY_ALIASES, BCP_EVENT_ORDERING, BCP_EVENT_SECURITY, BCP_EVENT_CORRELATION } from './events/bcp.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/bcp.mapper';
export { bcpResponseSchema, bcpListResponseSchema, bcpEventPayloadSchema, bcpStatusTransitionSchema, bcpImportRowSchema, bcpImportBatchSchema, bcpExportRequestSchema, bcpAdminConfigSchema, bcpBulkUpdateSchema, bcpBulkStatusChangeSchema } from './schemas/bcp.schemas';

// Type exports
export type { BcpStatus, BcpEventPayload, BcpSource, BcpStatusReason } from './types/bcp.types';
export type { BcpCreateDTO, BcpUpdateDTO, BcpResponseDTO, BcpListItemDTO, BcpDetailDTO, BcpAdminDTO, BcpImportDTO, BcpExportDTO, BcpSearchResultDTO, BcpAuditDTO, BcpBulkOperationDTO } from './types/bcp.dto';
export type { BcpWorkflowContext } from './services/bcp-workflow.service';
