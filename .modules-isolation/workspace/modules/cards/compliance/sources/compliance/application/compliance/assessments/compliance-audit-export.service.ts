import { safeQuery } from "@dos/db";

/**
 * Compliance Workspace — Audit Package, Export, Calendar, Regulatory Changes, Drift Detection
 *
 * This file is now a barrel re-export. The original implementation has been split into
 * focused service files for maintainability:
 *
 *   - compliance-audit-package.service.ts    — audit package, traceability matrix, PDF/XLSX/ZIP export
 *   - compliance-calendar.service.ts         — compliance calendar events
 *   - compliance-regulatory-changes.service.ts — regulatory change CRUD + impact analysis
 *   - compliance-foundation-lookups.service.ts — users, teams, departments, BUs lookups
 *   - compliance-export-data.service.ts      — controls/findings CSV/Excel export
 *   - compliance-drift-detection.service.ts  — overview snapshots, drift baselines, drift register
 */

export {
  exportComplianceReport,
  getAuditPackage,
  getTraceabilityMatrix,
  exportAuditPack,
  getAuditorDashboard,
} from "./compliance-audit-package.service";

export type {
  AuditPackageOptions,
  AuditPackageResult,
  TraceabilityMatrixResult,
  ExportAuditPackFormat,
  ExportAuditPackResult,
  AuditorDashboardData,
} from "./compliance-audit-package.service";

export { getComplianceCalendar } from "../core/compliance-calendar.service";

export {
  getRegulatoryChanges,
  createRegulatoryChange,
  assessRegulatoryImpact,
  updateRegulatoryChangeStatus,
  upsertRegulatoryChangeImpact,
  getRegulatoryChangeImpact,
} from "../core/compliance-regulatory-changes.service";

export {
  getFoundationUsers,
  getFoundationUserDetail,
  getFoundationTeams,
  getFoundationDepartments,
  getFoundationBusinessUnits,
} from "../core/compliance-foundation-lookups.service";

export {
  exportControls,
  exportFindings,
} from "../reporting/compliance-export-data.service";

export {
  captureComplianceOverviewSnapshot,
  detectComplianceDrift,
  captureDriftBaseline,
  detectControlFindingDrift,
  getDriftRegister,
} from "../automation/compliance-drift-detection.service";

export type { DriftDelta } from "../automation/compliance-drift-detection.service";
