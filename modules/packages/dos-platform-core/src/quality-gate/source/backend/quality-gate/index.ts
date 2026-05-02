// ── Quality Gate Module — Barrel Export ──────────────────────────────
// Side-effect imports: lifecycle + manifest registration
import './lifecycle-registration';
import './quality-gate.module';

// Event contracts
export {
  QGATE_EVENT_CONTRACT,
  QGATE_PUBLISHED_EVENTS,
  QGATE_CONSUMED_EVENTS,
  QGATE_EVENT_LEGACY_ALIASES,
  QGATE_EVENT_ORDERING,
  QGATE_EVENT_SECURITY,
  QGATE_EVENT_CORRELATION,
} from './events/quality-gate.events';

// Security
export { QGATE_PERMISSIONS, QGATE_ROLES, QGATE_ACTIONS } from './security/quality-gate.security';
export { QGATE_APPROVAL_MATRIX } from './security/quality-gate.approval-matrix';

// Contracts + types
export { DEFAULT_THRESHOLDS } from './contracts/quality-gate.contracts';
export type {
  QgateRunRecord,
  QgateStageResultRecord,
  QgateAiEvalScoreRecord,
  QgateSchemaDriftRecord,
  QgateThresholdRecord,
  QgateVrtSnapshotRecord,
  QgateMutationReportRecord,
  StageResult,
  QgateRunOutput,
  SchemaDriftReport,
  AiGuardrailsReport,
  BatteryResult,
} from './contracts/quality-gate.contracts';

export type {
  QgateRunStatus,
  QgateTriggerType,
  QgateStageCode,
  QgateDriftSeverity,
  QgateBatteryCode,
  QgateEventPayload,
  QgateStatusReason,
  QgateSource,
} from './types/quality-gate.types';

export type {
  QgateCreateRunDTO,
  QgateRunResponseDTO,
  QgateRunWithStagesDTO,
  QgateStageResultDTO,
  QgateRunOverrideDTO,
  QgateThresholdDTO,
  QgateThresholdUpdateDTO,
  QgateDriftEntryDTO,
  QgateAiEvalScoreDTO,
  QgateDashboardSummaryDTO,
  QgateTrendPointDTO,
  QgateHealthStatusDTO,
} from './types/quality-gate.dto';

// Manifest
export { QUALITY_GATE_MANIFEST } from './quality-gate.module';
