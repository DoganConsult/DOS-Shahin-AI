/**
 * Compliance Feature API DTOs — AGRC-OS
 * Typed interfaces for compliance-api.service.ts responses.
 */

/** Generic control row from /api/controls or /api/compliance-ws/controls */
export interface ControlRowDto {
  id: string;
  title?: string;
  status?: string;
  owner?: string;
  frameworkId?: string;
  controlCode?: string;
  description?: string;
  implementationStatus?: string;
  testResult?: string;
  evidenceCount?: number;
  [key: string]: unknown;
}

/** Generic finding row */
export interface FindingRowDto {
  id: string;
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  assignedTo?: string;
  sourceType?: string;
  sourceId?: string;
  dueDate?: string;
  frameworkId?: string;
  remediationPlan?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Paginated list response */
export interface PaginatedList<T> {
  items: T[];
  total: number;
}

/** Compliance savings metrics */
export interface ComplianceSavingsDto {
  totalSaved?: number;
  automationSavings?: number;
  efficiencyGains?: number;
  byCategory?: Record<string, number>;
  [key: string]: unknown;
}

/** Compliance export response */
export interface ComplianceExportDto {
  data?: unknown[];
  format?: string;
  generatedAt?: string;
  [key: string]: unknown;
}

/** Control monitoring data */
export interface ControlMonitoringItemDto {
  controlId?: string;
  title?: string;
  status?: string;
  slaStatus?: string;
  evidenceExpiry?: string;
  lastTestedAt?: string;
  [key: string]: unknown;
}

export interface ControlMonitoringResponse {
  approachingSla: ControlMonitoringItemDto[];
  pastSla: ControlMonitoringItemDto[];
  expiringEvidence: ControlMonitoringItemDto[];
  items: ControlMonitoringItemDto[];
  counts: { approaching: number; past: number; expiring: number };
}

/** Control detail */
export interface ControlDetailDto {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  owner?: string;
  frameworkId?: string;
  [key: string]: unknown;
}

/** Control test record */
export interface ControlTestDto {
  id?: string;
  control_id?: string;
  test_type?: string;
  result?: string;
  testedAt?: string;
  testedBy?: string;
  [key: string]: unknown;
}

/** Control failure record */
export interface ControlFailureDto {
  id: string;
  controlId?: string;
  failureType?: string;
  description?: string;
  resolvedAt?: string;
  [key: string]: unknown;
}

/** Control action record */
export interface ControlActionDto {
  id: string;
  controlId?: string;
  actionType?: string;
  status?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

/** Lifecycle summary */
export interface LifecycleSummaryDto {
  totalControls?: number;
  byState?: Record<string, number>;
  staleControls?: number;
  [key: string]: unknown;
}

/** Control transition history entry */
export interface TransitionHistoryDto {
  fromState: string;
  toState: string;
  changedBy?: string;
  changedAt: string;
  note?: string;
  [key: string]: unknown;
}

/** Control staleness check result */
export interface StalenessCheckDto {
  isStale: boolean;
  daysSinceLastUpdate?: number;
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

/** Framework CRUD row */
export interface FrameworkCrudDto {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  status?: string;
  version?: string;
  [key: string]: unknown;
}

/** Framework mapping row */
export interface FrameworkMappingRowDto {
  id: string;
  sourceFramework?: string;
  targetFramework?: string;
  mappingType?: string;
  [key: string]: unknown;
}

/** RCSA campaign */
export interface RcsaCampaignDto {
  id?: string;
  campaigns?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** NCA assessment structure */
export interface NcaStructureDto {
  domains?: Array<Record<string, unknown>>;
  totalControls?: number;
  [key: string]: unknown;
}

/** NCA assessment row */
export interface NcaAssessmentDto {
  id: string;
  name?: string;
  status?: string;
  score?: number;
  createdAt?: string;
  [key: string]: unknown;
}

/** Assessment template */
export interface AssessmentTemplateDto {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}

/** Assessment template category */
export interface TemplateCategoryDto {
  id?: string;
  name: string;
  count?: number;
  [key: string]: unknown;
}

/** Assessment progress */
export interface AssessmentProgressDto {
  assessmentId: string;
  completedItems?: number;
  totalItems?: number;
  progressPct?: number;
  [key: string]: unknown;
}

/** Calendar event */
export interface CalendarEventDto {
  id?: string;
  title: string;
  date: string;
  type?: string;
  frameworkId?: string;
  [key: string]: unknown;
}

/** Regulatory change */
export interface RegulatoryChangeItemDto {
  id: string;
  title: string;
  description?: string;
  regulatorCode?: string;
  effectiveDate?: string;
  severity?: string;
  status?: string;
  [key: string]: unknown;
}

/** Gap history entry */
export interface GapHistoryEntryDto {
  action: string;
  changedBy?: string;
  changedAt: string;
  details?: string;
  [key: string]: unknown;
}

/** Foundation user */
export interface FoundationUserDto {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/** Foundation team */
export interface FoundationTeamDto {
  id: string;
  name?: string;
  code?: string;
  memberCount?: number;
  [key: string]: unknown;
}

/** Foundation department */
export interface FoundationDepartmentDto {
  id: string;
  name?: string;
  code?: string;
  [key: string]: unknown;
}

/** Foundation business unit */
export interface FoundationBusinessUnitDto {
  id: string;
  name?: string;
  code?: string;
  [key: string]: unknown;
}

/** Compliance posture by org */
export interface CompliancePostureOrgDto {
  groupId: string;
  groupName?: string;
  complianceScore?: number;
  controlCount?: number;
  [key: string]: unknown;
}

/** Vendor posture */
export interface VendorPostureDto {
  totalVendors?: number;
  healthyVendors?: number;
  atRiskVendors?: number;
  [key: string]: unknown;
}

/** Audit integration responses */
export interface AuditSummaryDto {
  totalAudits?: number;
  openFindings?: number;
  [key: string]: unknown;
}

/** Attestation campaign */
export interface AttestationCampaignDto {
  id?: string;
  campaigns?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Obligation V2 */
export interface ObligationV2Dto {
  id: string;
  title?: string;
  frameworkId?: string;
  status?: string;
  ownerId?: string;
  [key: string]: unknown;
}

/** Obligation control mapping */
export interface ObligationControlDto {
  controlId: string;
  title?: string;
  mappingType?: string;
  coveragePercent?: number;
  [key: string]: unknown;
}

/** Generic mutation result */
export interface ComplianceMutationResult {
  success?: boolean;
  id?: string;
  message?: string;
  [key: string]: unknown;
}

/** Remediation row */
export interface RemediationRowDto {
  id: string;
  title?: string;
  status?: string;
  controlId?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

/** Gap analysis */
export interface GapAnalysisResultDto {
  frameworkId?: string;
  gaps?: Array<Record<string, unknown>>;
  totalGaps?: number;
  [key: string]: unknown;
}

/** CCM dashboard */
export interface CcmDashboardDto {
  totalControls?: number;
  monitoredControls?: number;
  failedControls?: number;
  [key: string]: unknown;
}

/** Team distribution */
export interface TeamDistributionDto {
  teams?: Array<{ teamId: string; teamName: string; controlCount: number }>;
  [key: string]: unknown;
}
