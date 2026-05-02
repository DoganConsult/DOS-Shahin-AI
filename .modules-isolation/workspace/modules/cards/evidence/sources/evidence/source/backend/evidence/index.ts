// ── Evidence Module — Barrel Export ──────────────────────────────────────────
// Law 2: security metadata is data-driven via ModuleManifest, not per-file.
// Security constants (permissions, roles, actions, approval matrix, ownership,
// SoD) live in data/evidence-security.ts — DAuth ingests them at startup.
// ─────────────────────────────────────────────────────────────────────────────

// Lifecycle registry registration (side-effect — S5/Z1.13)
import './lifecycle-registration';

// Security metadata (single source — Law 2)
export {
  EVIDENCE_MODULE_PERMISSIONS,
  EVIDENCE_MODULE_ACTIONS,
  EVIDENCE_MODULE_ROLES,
  EVIDENCE_APPROVAL_MATRIX,
  EVIDENCE_OWNERSHIP_RULES,
  EVIDENCE_SOD_RULES,
  EVIDENCE_TENANT_SCOPE_RULES,
  EVIDENCE_LIFECYCLE_DEFINITIONS,
} from './data/evidence-security';

// Runtime exports
export { EVIDENCE_POLICY } from './policies/evidence.policies';
export { EVIDENCE_STATUSES, EVIDENCE_DEFAULT_STATUS, EVIDENCE_LIMITS, EVIDENCE_TIMEOUTS, EVIDENCE_SLA_DEFAULTS } from './data/evidence-constants';
export { getEvidenceSeedData, seedEvidenceModule } from './data/evidence-seed';
export { emitEvidenceEvent, emitEvidenceStatusChange } from './services/core/evidence-event.service';
export { getEvidenceJobs } from './jobs/evidence-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/workflow/evidence-workflow.service';
export * as evidenceQuery from './repositories/evidence-query.repo';

export { default as evidenceAdminRoutes } from './routes/core/evidence-admin.routes';
export { EVIDENCE_EVENT_CONTRACT, EVIDENCE_PUBLISHED_EVENTS, EVIDENCE_CONSUMED_EVENTS, EVIDENCE_EVENT_LEGACY_ALIASES, EVIDENCE_EVENT_ORDERING, EVIDENCE_EVENT_SECURITY, EVIDENCE_EVENT_CORRELATION } from './events/evidence.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/evidence.mapper';
export { evidenceResponseSchema, evidenceListResponseSchema, evidenceEventPayloadSchema, evidenceStatusTransitionSchema, evidenceImportRowSchema, evidenceImportBatchSchema, evidenceExportRequestSchema, evidenceAdminConfigSchema, evidenceBulkUpdateSchema, evidenceBulkStatusChangeSchema } from './schemas/evidence.schemas';

// Contracts
export type { EvidenceItemContract, EvidenceRequestContract, EvidencePackageContract, EvidenceReviewContract, EvidenceCollectionScheduleContract, EvidenceFreshnessContract, EvidenceQualityContract, EvidenceDiagnosticsContract, EvidenceAdminSettingsContract, EvidenceListParams, EvidenceListResponse } from './contracts/evidence.contracts';

// Diagnostics
export { getEvidenceDiagnostics, getExpiredEvidenceDiagnostics, getFailedCollectionDiagnostics } from './diagnostics/evidence-diagnostics.service';
export type { ExpiredEvidenceDiagnostic, FailedCollectionDiagnostic } from './diagnostics/evidence-diagnostics.service';

// Lifecycle
export { EVIDENCE_ITEM_STATES, EVIDENCE_ITEM_TRANSITIONS, EVIDENCE_COLLECTION_STATES, EVIDENCE_COLLECTION_TRANSITIONS } from './workflows/evidence-lifecycle';
export type { EvidenceItemState, EvidenceCollectionState } from './workflows/evidence-lifecycle';

// Type exports
export type { EvidenceStatus, EvidenceEventPayload, EvidenceSource, EvidenceStatusReason } from './types/evidence.types';
export type { EvidenceCreateDTO, EvidenceUpdateDTO, EvidenceResponseDTO, EvidenceListItemDTO, EvidenceDetailDTO, EvidenceAdminDTO, EvidenceImportDTO, EvidenceExportDTO, EvidenceSearchResultDTO, EvidenceAuditDTO, EvidenceBulkOperationDTO } from './types/evidence.dto';
export type { EvidenceWorkflowContext } from './services/workflow/evidence-workflow.service';
