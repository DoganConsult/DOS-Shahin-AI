// ── Portals Module — Barrel Export ──────────────────────────────
// Runtime exports
export { PORTALS_POLICY } from './policies/portals.policies';
export { PORTALS_STATUSES, PORTALS_DEFAULT_STATUS, PORTALS_LIMITS, PORTALS_TIMEOUTS, PORTALS_SLA_DEFAULTS } from './data/portals-constants';
export { getPortalsSeedData, seedPortalsModule } from './data/portals-seed';
export { emitPortalsEvent, emitPortalsStatusChange } from './services/portals-event.service';
export { PORTALS_AI_CONFIG, isPortalsAiActionAllowed, isPortalsAiActionBlocked } from './services/portals-ai.service';
export { getPortalsJobs } from './jobs/portals-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/portals-workflow.service';
export * as portalsQuery from './repositories/portals-query.repo';
export { default as portalsAdminRoutes } from './routes/portals-admin.routes';
export { PORTALS_EVENT_CONTRACT, PORTALS_PUBLISHED_EVENTS, PORTALS_CONSUMED_EVENTS, PORTALS_EVENT_LEGACY_ALIASES, PORTALS_EVENT_ORDERING, PORTALS_EVENT_SECURITY, PORTALS_EVENT_CORRELATION } from './events/portals.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/portals.mapper';
export { portalsResponseSchema, portalsListResponseSchema, portalsEventPayloadSchema, portalsStatusTransitionSchema, portalsImportRowSchema, portalsImportBatchSchema, portalsExportRequestSchema, portalsAdminConfigSchema, portalsBulkUpdateSchema, portalsBulkStatusChangeSchema } from './schemas/portals.schemas';

// Type exports
export type { PortalsStatus, PortalsEventPayload, PortalsSource, PortalsStatusReason } from './types/portals.types';
export type { PortalsCreateDTO, PortalsUpdateDTO, PortalsResponseDTO, PortalsListItemDTO, PortalsDetailDTO, PortalsAdminDTO, PortalsImportDTO, PortalsExportDTO, PortalsSearchResultDTO, PortalsAuditDTO, PortalsBulkOperationDTO } from './types/portals.dto';
export type { PortalsWorkflowContext } from './services/portals-workflow.service';
