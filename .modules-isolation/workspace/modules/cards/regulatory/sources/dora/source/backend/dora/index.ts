// ── Constants and Seed ──────────────────────────────────────────────────
export { DORA_STATUSES, DORA_DEFAULT_STATUS, DORA_LIMITS, DORA_TIMEOUTS, DORA_SLA_DEFAULTS } from './data/dora-constants';
export { seedDoraModule, getDoraSeedData } from './data/dora-seed';

// ── Event Service ──────────────────────────────────────────────────────
export { emitDoraEvent, emitDoraStatusChange, emitObligationOverdue, emitConcentrationRisk, emitAiAnalysisCompleted, DORA_EVENTS } from './services/dora-event.service';
export type { DoraEventType } from './services/dora-event.service';

// ── Event Contract ─────────────────────────────────────────────────────
export { DORA_EVENT_CONTRACT, DORA_PUBLISHED_EVENTS, DORA_CONSUMED_EVENTS, DORA_EVENT_LEGACY_ALIASES, DORA_EVENT_ORDERING, DORA_EVENT_SECURITY, DORA_EVENT_CORRELATION } from './events/dora.events';

// ── Routes ─────────────────────────────────────────────────────────────
export { default as doraRoutes } from './routes/dora.routes';

// ── Services ───────────────────────────────────────────────────────────
export * as doraObligationService from './services/dora-obligation.service';
export * as doraResilienceService from './services/dora-resilience.service';
export * as doraMappingService from './services/dora-mapping.service';
export * as doraDashboardService from './services/dora-dashboard.service';
export * as doraAiService from './services/dora-ai.service';

// ── Diagnostics ────────────────────────────────────────────────────────
export { runDiagnostics } from './diagnostics/dora-diagnostics.service';

// ── Jobs ───────────────────────────────────────────────────────────────
export { getDoraJobs } from './jobs/dora-monitor.job';

// ── Types ──────────────────────────────────────────────────────────────
export type { DoraStatus, DoraEventPayload, DoraSource, DoraStatusReason } from './types/dora.types';
export type { DoraIctAssetCreateDTO, DoraIctAssetUpdateDTO, DoraIctAssetResponseDTO, DoraResilienceTestCreateDTO, DoraResilienceTestResponseDTO, DoraIncidentReportDTO, DoraThreatIntelDTO, DoraBackupConfigDTO } from './types/dora.dto';

// ── Contracts ──────────────────────────────────────────────────────────
export type {
  DoraObligation, DoraObligationMapping,
  DoraResilienceTest, DoraResilienceResult,
  DoraFrameworkMapping, DoraControlMapping,
  DoraReadinessResponse, DoraGapAnalysisResponse,
  DoraDashboardSummary, DoraEvidenceCoverage,
  DoraDiagnosticsResult, DoraDiagnosticsCheck,
  DoraLifecycleTransitionRequest, DoraLifecycleTransitionResponse,
  DoraAiRegulatorySummary, DoraAiGapNarration, DoraAiEvidenceSufficiency,
} from './contracts/dora.contract';
