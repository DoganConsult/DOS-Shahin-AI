// ── Exception Module — Barrel Export ──────────────────────────────
// Runtime exports
export { EXCEPTION_POLICY } from './policies/exception.policies';
export { EXCEPTION_STATUSES, EXCEPTION_DEFAULT_STATUS, EXCEPTION_LIMITS, EXCEPTION_TIMEOUTS, EXCEPTION_SLA_DEFAULTS } from './data/exception-constants';
export { getExceptionSeedData, seedExceptionModule } from './data/exception-seed';
export { emitExceptionEvent, emitExceptionStatusChange } from './services/exception-event.service';
export { EXCEPTION_AI_CONFIG, isExceptionAiActionAllowed, isExceptionAiActionBlocked } from './services/exception-ai.service';
export { getExceptionJobs } from './jobs/exception-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/exception-workflow.service';
export * as exceptionQuery from './repositories/exception-query.repo';
export { default as exceptionAdminRoutes } from './routes/exception-admin.routes';
export { EXCEPTION_EVENT_CONTRACT, EXCEPTION_PUBLISHED_EVENTS, EXCEPTION_CONSUMED_EVENTS, EXCEPTION_EVENT_LEGACY_ALIASES, EXCEPTION_EVENT_ORDERING, EXCEPTION_EVENT_SECURITY, EXCEPTION_EVENT_CORRELATION } from './events/exception.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/exception.mapper';
export { exceptionResponseSchema, exceptionListResponseSchema, exceptionEventPayloadSchema, exceptionStatusTransitionSchema, exceptionImportRowSchema, exceptionImportBatchSchema, exceptionExportRequestSchema, exceptionAdminConfigSchema, exceptionBulkUpdateSchema, exceptionBulkStatusChangeSchema } from './schemas/exception.schemas';

// MP-15 canonical service families
export { intakeException, validateIntake } from './services/exception-intake.service';
export { upsertJustification, getJustification } from './services/exception-justification.service';
export { linkCompensatingControl, unlinkCompensatingControl, updateEffectiveness, getCompensatingControls } from './services/exception-compensating-control.service';
export { recordApprovalDecision, getApprovalHistory } from './approvals/exception-approval.service';
export { submitRenewalRequest, getRenewalsByException } from './renewals/exception-renewal-intake.service';
export { ExceptionAdminService } from './services/exception-admin.service';
export { ExceptionDiagnosticsService } from './diagnostics/exception-diagnostics.service';
export { ExceptionDashboardService } from './services/exception-dashboard.service';

// Type exports
export type { ExceptionStatus, ExceptionEventPayload, ExceptionSource, ExceptionStatusReason } from './types/exception.types';
export type { ExceptionCreateDTO, ExceptionUpdateDTO, ExceptionResponseDTO, ExceptionListItemDTO, ExceptionDetailDTO, ExceptionAdminDTO, ExceptionImportDTO, ExceptionExportDTO, ExceptionSearchResultDTO, ExceptionAuditDTO, ExceptionBulkOperationDTO } from './types/exception.dto';
export type { ExceptionWorkflowContext } from './services/exception-workflow.service';
export type { ExceptionIntakeData } from './services/exception-intake.service';
export type { JustificationData, JustificationRecord } from './services/exception-justification.service';
export type { CompensatingControlLink, LinkCompensatingControlData } from './services/exception-compensating-control.service';
export type { ApprovalDecision, ApprovalRecord } from './approvals/exception-approval.service';
export type { RenewalIntakeData, RenewalRecord } from './renewals/exception-renewal-intake.service';
export type { ExceptionAdminOverview } from './services/exception-admin.service';
