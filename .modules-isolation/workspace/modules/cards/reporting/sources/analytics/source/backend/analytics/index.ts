// ── Analytics Module — Barrel Export ──────────────────────────────
// Runtime exports
export { ANALYTICS_POLICY } from './policies/analytics.policies';
export { ANALYTICS_STATUSES, ANALYTICS_DEFAULT_STATUS, ANALYTICS_LIMITS, ANALYTICS_TIMEOUTS, ANALYTICS_SLA_DEFAULTS } from './data/analytics-constants';
export { getAnalyticsSeedData, seedAnalyticsModule } from './data/analytics-seed';
export { emitAnalyticsEvent, emitAnalyticsStatusChange } from './services/analytics/analytics-event.service';
export { ANALYTICS_AI_CONFIG, isAnalyticsAiActionAllowed, isAnalyticsAiActionBlocked } from './services/analytics/analytics-ai.service';
export { getAnalyticsJobs } from './jobs/analytics-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/analytics/analytics-workflow.service';
export * as analyticsQuery from './repositories/analytics-query.repo';
export { default as analyticsAdminRoutes } from './routes/analytics-admin.routes';
export { ANALYTICS_EVENT_CONTRACT, ANALYTICS_PUBLISHED_EVENTS, ANALYTICS_CONSUMED_EVENTS, ANALYTICS_EVENT_LEGACY_ALIASES, ANALYTICS_EVENT_ORDERING, ANALYTICS_EVENT_SECURITY, ANALYTICS_EVENT_CORRELATION } from './events/analytics.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/analytics.mapper';
export { analyticsResponseSchema, analyticsListResponseSchema, analyticsEventPayloadSchema, analyticsStatusTransitionSchema, analyticsImportRowSchema, analyticsImportBatchSchema, analyticsExportRequestSchema, analyticsAdminConfigSchema, analyticsBulkUpdateSchema, analyticsBulkStatusChangeSchema } from './schemas/analytics.schemas';

// Type exports
export type { AnalyticsStatus, AnalyticsEventPayload, AnalyticsSource, AnalyticsStatusReason } from '@dos/types/analytics';
export type { AnalyticsCreateDTO, AnalyticsUpdateDTO, AnalyticsResponseDTO, AnalyticsListItemDTO, AnalyticsDetailDTO, AnalyticsAdminDTO, AnalyticsImportDTO, AnalyticsExportDTO, AnalyticsSearchResultDTO, AnalyticsAuditDTO, AnalyticsBulkOperationDTO } from './types/analytics.dto';
export type { AnalyticsWorkflowContext } from './services/analytics/analytics-workflow.service';
