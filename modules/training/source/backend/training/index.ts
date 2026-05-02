// ── Training Module — Barrel Export ──────────────────────────────
// Runtime exports
export { TRAINING_POLICY } from './policies/training.policies';
export { TRAINING_STATUSES, TRAINING_DEFAULT_STATUS, TRAINING_LIMITS, TRAINING_TIMEOUTS, TRAINING_SLA_DEFAULTS } from './data/training-constants';
export { getTrainingSeedData, seedTrainingModule } from './data/training-seed';
export { emitTrainingEvent, emitTrainingStatusChange } from './services/training-event.service';
export { TRAINING_AI_CONFIG, isTrainingAiActionAllowed, isTrainingAiActionBlocked } from './services/training-ai.service';
export { getTrainingJobs } from './jobs/training-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/training-workflow.service';
export * as trainingQuery from './repositories/training-query.repo';
export { default as trainingAdminRoutes } from './routes/training-admin.routes';
export { TRAINING_EVENT_CONTRACT, TRAINING_PUBLISHED_EVENTS, TRAINING_CONSUMED_EVENTS, TRAINING_EVENT_LEGACY_ALIASES, TRAINING_EVENT_ORDERING, TRAINING_EVENT_SECURITY, TRAINING_EVENT_CORRELATION } from './events/training.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/training.mapper';
export { trainingResponseSchema, trainingListResponseSchema, trainingEventPayloadSchema, trainingStatusTransitionSchema, trainingImportRowSchema, trainingImportBatchSchema, trainingExportRequestSchema, trainingAdminConfigSchema, trainingBulkUpdateSchema, trainingBulkStatusChangeSchema } from './schemas/training.schemas';

// Type exports
export type { TrainingStatus, TrainingEventPayload, TrainingSource, TrainingStatusReason } from '@dos/types/training';
export type { TrainingCreateDTO, TrainingUpdateDTO, TrainingResponseDTO, TrainingListItemDTO, TrainingDetailDTO, TrainingAdminDTO, TrainingImportDTO, TrainingExportDTO, TrainingSearchResultDTO, TrainingAuditDTO, TrainingBulkOperationDTO } from './types/training.dto';
export type { TrainingWorkflowContext } from './services/training-workflow.service';
