// ── Incident Module — Barrel Export ──────────────────────────────
// Runtime exports
export { INCIDENT_POLICY } from './policies/incident.policies';
export { INCIDENT_STATUSES, INCIDENT_DEFAULT_STATUS, INCIDENT_LIMITS, INCIDENT_TIMEOUTS, INCIDENT_SLA_DEFAULTS } from './data/incident-constants';
export { getIncidentSeedData, seedIncidentModule } from './data/incident-seed';
export { emitIncidentEvent, emitIncidentStatusChange } from './services/incident/incident-event.service';
export { INCIDENT_AI_CONFIG, isIncidentAiActionAllowed, isIncidentAiActionBlocked } from './services/incident/incident-ai.service';
export { getIncidentJobs } from './jobs/incident-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/incident/incident-workflow.service';
export * as incidentQuery from './repositories/incident-query.repo';
export { default as incidentAdminRoutes } from './routes/incident-admin.routes';
export { INCIDENT_EVENT_CONTRACT, INCIDENT_PUBLISHED_EVENTS, INCIDENT_CONSUMED_EVENTS, INCIDENT_EVENT_LEGACY_ALIASES, INCIDENT_EVENT_ORDERING, INCIDENT_EVENT_SECURITY, INCIDENT_EVENT_CORRELATION } from './events/incident.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/incident.mapper';
export { incidentResponseSchema, incidentListResponseSchema, incidentEventPayloadSchema, incidentStatusTransitionSchema, incidentImportRowSchema, incidentImportBatchSchema, incidentExportRequestSchema, incidentAdminConfigSchema, incidentBulkUpdateSchema, incidentBulkStatusChangeSchema } from './schemas/incident.schemas';

// Type exports
export type { IncidentStatus, IncidentEventPayload, IncidentSource, IncidentStatusReason } from '@dos/types/incident';
export type { IncidentCreateDTO, IncidentUpdateDTO, IncidentResponseDTO, IncidentListItemDTO, IncidentDetailDTO, IncidentAdminDTO, IncidentImportDTO, IncidentExportDTO, IncidentSearchResultDTO, IncidentAuditDTO, IncidentBulkOperationDTO } from './types/incident.dto';
export type { IncidentWorkflowContext } from './services/incident/incident-workflow.service';
