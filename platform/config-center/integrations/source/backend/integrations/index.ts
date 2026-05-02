// ── Integrations Module — Barrel Export ──────────────────────────────
// Runtime exports
export { INTEGRATIONS_POLICY } from './policies/integrations.policies';
export { INTEGRATIONS_STATUSES, INTEGRATIONS_DEFAULT_STATUS, INTEGRATIONS_LIMITS, INTEGRATIONS_TIMEOUTS, INTEGRATIONS_SLA_DEFAULTS } from './data/integrations-constants';
export { getIntegrationsSeedData, seedIntegrationsModule } from './data/integrations-seed';
export { emitIntegrationsEvent, emitIntegrationsStatusChange } from './services/integrations-event.service';
export { INTEGRATIONS_AI_CONFIG, isIntegrationsAiActionAllowed, isIntegrationsAiActionBlocked } from './services/integrations-ai.service';
export { getIntegrationsJobs } from './jobs/integrations-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/integrations-workflow.service';
export * as integrationsQuery from './repositories/integrations-query.repo';
export { default as integrationsAdminRoutes } from './routes/integrations-admin.routes';
export { INTEGRATIONS_EVENT_CONTRACT, INTEGRATIONS_PUBLISHED_EVENTS, INTEGRATIONS_CONSUMED_EVENTS, INTEGRATIONS_EVENT_LEGACY_ALIASES, INTEGRATIONS_EVENT_ORDERING, INTEGRATIONS_EVENT_SECURITY, INTEGRATIONS_EVENT_CORRELATION } from './events/integrations.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/integrations.mapper';
export { integrationsResponseSchema, integrationsListResponseSchema, integrationsEventPayloadSchema, integrationsStatusTransitionSchema, integrationsImportRowSchema, integrationsImportBatchSchema, integrationsExportRequestSchema, integrationsAdminConfigSchema, integrationsBulkUpdateSchema, integrationsBulkStatusChangeSchema } from './schemas/integrations.schemas';

// Type exports
export type { IntegrationsStatus, IntegrationsEventPayload, IntegrationsSource, IntegrationsStatusReason } from './types/integrations.types';
export type { IntegrationsCreateDTO, IntegrationsUpdateDTO, IntegrationsResponseDTO, IntegrationsListItemDTO, IntegrationsDetailDTO, IntegrationsAdminDTO, IntegrationsImportDTO, IntegrationsExportDTO, IntegrationsSearchResultDTO, IntegrationsAuditDTO, IntegrationsBulkOperationDTO } from './types/integrations.dto';
export type { IntegrationsWorkflowContext } from './services/integrations-workflow.service';
