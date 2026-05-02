/**
 * Controls Module — AGRC-OS
 *
 * Standalone module owning the control lifecycle: library, testing,
 * certifications, deficiencies, monitoring, and reporting.
 *
 * Route files are re-exported from the compliance module during the
 * extraction phase. New routes (home, detail, mapping, certifications,
 * deficiencies, monitoring-admin, reports, admin) are authored here.
 */

// ── Routes (re-exported from compliance during migration) ────────────

export { default as controlsRoutes } from '../compliance/routes/misc/controls.routes';
export { default as controlLifecycleRoutes } from '../compliance/routes/control-lifecycle.routes';

export { default as controlProcessCycleRoutes } from '../compliance/routes/misc/control-process-cycle.routes';

// ── New Routes (Phase 1+) ────────────────────────────────────────────
export { default as controlHomeRoutes } from './routes/control-home.routes';
export { default as controlDetailRoutes } from './routes/control-detail.routes';
export { default as controlWorkQueueRoutes } from './routes/control-work-queue.routes';
export { default as controlMappingRoutes } from './routes/control-mapping.routes';
export { default as controlCertificationRoutes } from './routes/control-certification.routes';
export { default as controlDeficiencyRoutes } from './routes/control-deficiency.routes';
export { default as controlMonitoringAdminRoutes } from './routes/control-monitoring-admin.routes';
export { default as controlReportsRoutes } from './routes/control-reports.routes';
export { default as controlAdminRoutes } from './routes/control-admin.routes';
export { default as controlWorkflowRoutes } from './routes/control-workflow.routes';

// ── Services (re-exported from compliance during migration) ──────────
export { checkStaleness as ControlLifecycleCheckStaleness } from '../compliance/services/ccm/control-lifecycle.service';
export { getControlProcessCycle as ControlProcessCycleService } from '../compliance/services/misc/control-process-cycle.service';

export { ControlDependencyGraph as ControlDependencyGraphService } from '../compliance/services/misc/control-dependency-graph.service';

// ── New Services (Phase 1+) ──────────────────────────────────────────
export { ControlHomeService } from './services/control-home.service';
export { ControlDetailService } from './services/control-detail.service';
export { ControlWorkQueueService } from './services/control-work-queue.service';
export { ControlMappingService } from './services/control-mapping.service';
export { ControlCertificationService } from './services/control-certification.service';
export { ControlDeficiencyService } from './services/control-deficiency.service';
export { ControlMonitoringAdminService } from './services/control-monitoring-admin.service';
export { ControlReportingService } from './services/control-reporting.service';
export { ControlAdminService } from './services/control-admin.service';
export { ControlWorkflowService } from './services/control-workflow.service';
export { ControlNotificationService } from './services/control-notification.service';
export { ControlHealthSnapshotService } from './services/control-health-snapshot.service';

// ── Scheduled Jobs ───────────────────────────────────────────────────
export { registerControlsJobs } from './services/controls-jobs.service';

// ── Core Domain Services (MP-14) ─────────────────────────────────────
export { ControlLibraryService } from './services/control-library.service';
export { ControlDesignService } from './services/control-design.service';
export { ControlOwnershipService } from './services/control-ownership.service';
export { ControlEffectivenessService } from './services/control-effectiveness.service';
export { ControlAutomationStateService } from './services/control-automation-state.service';

// ── Diagnostics ──────────────────────────────────────────────────────
export { ControlsDiagnosticsService } from './diagnostics/controls-diagnostics.service';

// ── Types ────────────────────────────────────────────────────────────
export type {
  Control,
  ControlCreateInput,
  ControlUpdateInput,
  ControlListFilter,
  ControlListResult,
  ControlDesignMetadata,
  ControlOwnerRecord,
  ControlEffectivenessRecord,
  ControlAutomationStateRecord,
  ControlEventPayload,
  ControlStatus,
  ControlType,
  ControlAutomationLevel,
  ControlTestResult,
  ControlTestType,
  ControlDeficiencySeverity,
  ControlStatusReason,
} from './types/controls.types';
