// ── Notification Module — Barrel Export ──────────────────────────────
// Runtime exports
export { NOTIFICATION_POLICY } from './policies/notification.policies';
export { NOTIFICATION_STATUSES, NOTIFICATION_DEFAULT_STATUS, NOTIFICATION_LIMITS, NOTIFICATION_TIMEOUTS, NOTIFICATION_SLA_DEFAULTS } from './data/notification-constants';
export { getNotificationSeedData, seedNotificationModule } from './data/notification-seed';
export { emitNotificationEvent, emitNotificationStatusChange } from './services/notification-event.service';
export { NOTIFICATION_AI_CONFIG, isNotificationAiActionAllowed, isNotificationAiActionBlocked } from './services/notification-ai.service';
export { getNotificationJobs } from './jobs/notification-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/notification-workflow.service';
export * as notificationQuery from './repositories/notification-query.repo';
export { default as notificationAdminRoutes } from './routes/notification-admin.routes';
export { NOTIFICATION_EVENT_CONTRACT, NOTIFICATION_PUBLISHED_EVENTS, NOTIFICATION_CONSUMED_EVENTS, NOTIFICATION_EVENT_LEGACY_ALIASES, NOTIFICATION_EVENT_ORDERING, NOTIFICATION_EVENT_SECURITY, NOTIFICATION_EVENT_CORRELATION } from './events/notification.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/notification.mapper';
export { notificationResponseSchema, notificationListResponseSchema, notificationEventPayloadSchema, notificationStatusTransitionSchema, notificationImportRowSchema, notificationImportBatchSchema, notificationExportRequestSchema, notificationAdminConfigSchema, notificationBulkUpdateSchema, notificationBulkStatusChangeSchema } from './schemas/notification.schemas';

// Type exports
export type { NotificationStatus, NotificationEventPayload, NotificationSource, NotificationStatusReason } from '@dos/types/notification';
export type { NotificationCreateDTO, NotificationUpdateDTO, NotificationResponseDTO, NotificationListItemDTO, NotificationDetailDTO, NotificationAdminDTO, NotificationImportDTO, NotificationExportDTO, NotificationSearchResultDTO, NotificationAuditDTO, NotificationBulkOperationDTO } from './types/notification.dto';
export type { NotificationWorkflowContext } from './services/notification-workflow.service';
