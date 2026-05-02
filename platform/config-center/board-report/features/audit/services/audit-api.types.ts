/**
 * Audit API DTOs -- AGRC-OS
 * Extracted from audit-api.service.ts (features) for strict typing.
 */
import { MessageResponse } from '@app/core/models/shared.types';

// ── Overview ────────────────────────────────────────────────────────

export interface AuditOverviewDto {
  totalEngagements: number;
  openFindings: number;
  overdueActions: number;
  complianceRate?: number;
  recentActivity?: Array<{ id: string; type: string; description: string; timestamp: string }>;
}

// ── Engagements ─────────────────────────────────────────────────────

export interface AuditEngagementDto {
  id: string;
  title?: string;
  type?: string;
  status?: string;
  leadAuditorId?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  description?: string;
}

export interface CreateAuditEngagementRequest {
  title: string;
  type?: string;
  status?: string;
  leadAuditorId?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  description?: string;
}

export interface UpdateAuditEngagementRequest {
  title?: string;
  type?: string;
  status?: string;
  leadAuditorId?: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
  description?: string;
}

// ── Plans ───────────────────────────────────────────────────────────

export interface AuditPlanDto {
  id: string;
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  engagementId?: string;
}

export interface CreateAuditPlanRequest {
  title: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  engagementId?: string;
}

export interface UpdateAuditPlanRequest {
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// ── Findings ────────────────────────────────────────────────────────

export interface AuditFindingDto {
  id: string;
  title?: string;
  auditId?: string;
  severity?: string;
  status?: string;
  description?: string;
  recommendation?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface CreateAuditFindingRequest {
  title: string;
  auditId?: string;
  severity?: string;
  status?: string;
  description?: string;
  recommendation?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface UpdateAuditFindingRequest {
  title?: string;
  severity?: string;
  status?: string;
  description?: string;
  recommendation?: string;
  assignedTo?: string;
  dueDate?: string;
}

// ── Root Causes ─────────────────────────────────────────────────────

export interface RootCauseDto {
  id: string;
  findingId: string;
  category?: string;
  description?: string;
}

export interface CreateRootCauseRequest {
  category?: string;
  description: string;
}

// ── Impacts ─────────────────────────────────────────────────────────

export interface ImpactDto {
  id: string;
  findingId: string;
  area?: string;
  severity?: string;
  description?: string;
}

export interface CreateImpactRequest {
  area?: string;
  severity?: string;
  description: string;
}

// ── CAPA ────────────────────────────────────────────────────────────

export interface CapaPlanDto {
  id: string;
  title?: string;
  findingId?: string;
  type?: string; // corrective | preventive
  status?: string;
  assignedTo?: string;
  dueDate?: string;
  description?: string;
}

export interface CreateCapaPlanRequest {
  title: string;
  findingId?: string;
  type?: string;
  assignedTo?: string;
  dueDate?: string;
  description?: string;
}

export interface UpdateCapaPlanRequest {
  title?: string;
  status?: string;
  assignedTo?: string;
  dueDate?: string;
  description?: string;
}

// ── Validation / Closure Reviews ────────────────────────────────────

export interface ClosureReviewDto {
  id: string;
  findingId?: string;
  reviewerId?: string;
  status?: string;
  comments?: string;
  reviewedAt?: string;
}

export interface CreateClosureReviewRequest {
  findingId: string;
  reviewerId?: string;
  comments?: string;
}

// ── Reports ─────────────────────────────────────────────────────────

export interface AuditReportDto {
  planId: string;
  summary?: string;
  findings?: AuditFindingDto[];
  generatedAt?: string;
  status?: string;
}

// ── Audit Universe ──────────────────────────────────────────────────

export interface AuditUniverseEntityDto {
  id: string;
  name?: string;
  type?: string;
  riskLevel?: string;
  lastAuditDate?: string;
  description?: string;
  foundationEntityId?: string;
}

export interface CreateAuditUniverseEntityRequest {
  name: string;
  type?: string;
  riskLevel?: string;
  description?: string;
}

export interface UpdateAuditUniverseEntityRequest {
  name?: string;
  type?: string;
  riskLevel?: string;
  description?: string;
}

// ── Risk Scoring ────────────────────────────────────────────────────

export interface AuditRiskScoreDto {
  id: string;
  universeEntityId: string;
  factor?: string;
  score?: number;
  weight?: number;
  notes?: string;
}

export interface UpsertAuditRiskScoreRequest {
  universeEntityId: string;
  factor?: string;
  score: number;
  weight?: number;
  notes?: string;
}

export interface RankedListItemDto {
  universeEntityId: string;
  entityName?: string;
  weightedScore: number;
  riskLevel?: string;
}

export interface WeightedScoreDto {
  universeEntityId: string;
  weightedScore: number;
  factors: Array<{ factor: string; score: number; weight: number }>;
}

// ── Schedules ───────────────────────────────────────────────────────

export interface AuditScheduleDto {
  id: string;
  title?: string;
  frequency?: string;
  nextDueDate?: string;
  status?: string;
  enabled?: boolean;
  universeEntityId?: string;
}

export interface CreateAuditScheduleRequest {
  title: string;
  frequency?: string;
  nextDueDate?: string;
  universeEntityId?: string;
}

export interface UpdateAuditScheduleRequest {
  title?: string;
  frequency?: string;
  nextDueDate?: string;
  status?: string;
}

// ── Working Papers ──────────────────────────────────────────────────

export interface WorkingPaperDto {
  id: string;
  auditId: string;
  title?: string;
  content?: string;
  status?: string;
  reviewerId?: string;
  createdBy?: string;
}

export interface CreateWorkingPaperRequest {
  auditId: string;
  title: string;
  content?: string;
}

export interface UpdateWorkingPaperRequest {
  title?: string;
  content?: string;
  status?: string;
}

// ── Team ────────────────────────────────────────────────────────────

export interface AuditTeamMemberDto {
  id: string;
  auditId: string;
  userId: string;
  role?: string;
  hoursPlanned?: number;
  hoursActual?: number;
}

export interface AddAuditTeamMemberRequest {
  auditId: string;
  userId: string;
  role?: string;
  hoursPlanned?: number;
}

export interface AuditTeamWorkloadDto {
  members: Array<{ userId: string; name?: string; openAudits: number; hoursPlanned: number; hoursActual: number }>;
}

// ── Repeat Findings ─────────────────────────────────────────────────

export interface RepeatFindingDto {
  id: string;
  findingId: string;
  previousFindingId?: string;
  occurrenceCount?: number;
  status?: string;
}

export interface LinkRepeatFindingRequest {
  findingId: string;
  previousFindingId: string;
}

export interface RepeatFindingHistoryDto {
  findingId: string;
  occurrences: Array<{ auditId: string; findingId: string; date: string; severity: string }>;
}

// ── QA Reviews ──────────────────────────────────────────────────────

export interface QaReviewDto {
  id: string;
  auditId: string;
  reviewerId?: string;
  status?: string;
  comments?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface CreateQaReviewRequest {
  auditId: string;
  reviewerId?: string;
  comments?: string;
}

// ── Finding Trends ──────────────────────────────────────────────────

export interface FindingTrendDto {
  date: string;
  count: number;
  severity?: string;
}

export interface FindingAgingDto {
  buckets: Array<{ range: string; count: number }>;
}

export interface FindingSeverityDistributionDto {
  distribution: Array<{ severity: string; count: number }>;
}

export interface RecurringFindingDto {
  findingId: string;
  title?: string;
  occurrenceCount: number;
  lastOccurrence?: string;
}

// ── Ratings ─────────────────────────────────────────────────────────

export interface AuditRatingDto {
  id: string;
  auditId: string;
  rating?: string;
  score?: number;
  comments?: string;
  ratedBy?: string;
  ratedAt?: string;
}

export interface CreateAuditRatingRequest {
  auditId: string;
  rating: string;
  score?: number;
  comments?: string;
}

export interface AuditRatingSummaryDto {
  totalRatings: number;
  averageScore: number;
  distribution: Array<{ rating: string; count: number }>;
}

// ── CAPA Effectiveness ──────────────────────────────────────────────

export interface CapaEffectivenessDto {
  id: string;
  capaId: string;
  measurementDate?: string;
  effective?: boolean;
  score?: number;
  notes?: string;
}

export interface CreateCapaEffectivenessRequest {
  capaId: string;
  effective: boolean;
  score?: number;
  notes?: string;
}

export interface CapaEffectivenessRateDto {
  totalCapa: number;
  measured: number;
  effectiveRate: number;
}

// ── Committee ───────────────────────────────────────────────────────

export interface AuditExecutiveSummaryDto {
  overallStatus: string;
  keyFindings: Array<{ id: string; title: string; severity: string }>;
  trendsNarrative?: string;
}

export interface AuditCommitteeMetricsDto {
  totalAudits: number;
  completedAudits: number;
  openFindings: number;
  closedFindings: number;
  averageClosureTime?: number;
}

export interface AuditBoardDashboardDto {
  healthScore: number;
  keyMetrics: Array<{ metric: string; value: number; trend: string }>;
  attentionItems: Array<{ id: string; title: string; severity: string }>;
}

// ── External Coordination ───────────────────────────────────────────

export interface ExternalCoordinationDto {
  id: string;
  title?: string;
  externalParty?: string;
  type?: string;
  status?: string;
  auditId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateExternalCoordinationRequest {
  title: string;
  externalParty?: string;
  type?: string;
  auditId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateExternalCoordinationRequest {
  title?: string;
  externalParty?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// ── Regulatory Tracking ─────────────────────────────────────────────

export interface RegulatoryTrackingDto {
  id: string;
  regulatorName?: string;
  requirementCode?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  linkedAuditId?: string;
}

export interface CreateRegulatoryTrackingRequest {
  regulatorName: string;
  requirementCode?: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateRegulatoryTrackingRequest {
  regulatorName?: string;
  requirementCode?: string;
  description?: string;
  status?: string;
  dueDate?: string;
}

// ── Test Plans ──────────────────────────────────────────────────────

export interface TestPlanDto {
  id: string;
  auditId: string;
  controlId?: string;
  title?: string;
  testType?: string;
  status?: string;
  result?: string;
}

export interface CreateTestPlanRequest {
  auditId: string;
  controlId?: string;
  title: string;
  testType?: string;
}

export interface UpdateTestResultRequest {
  result: string;
  status?: string;
  notes?: string;
}

export interface TestCoverageDto {
  auditId: string;
  totalControls: number;
  testedControls: number;
  coveragePercent: number;
}

// ── Finding SLAs ────────────────────────────────────────────────────

export interface FindingSlaDto {
  id: string;
  severity: string;
  maxDays: number;
  escalationDays?: number;
  active?: boolean;
}

export interface CreateFindingSlaRequest {
  severity: string;
  maxDays: number;
  escalationDays?: number;
}

export interface BreachedSlaDto {
  findingId: string;
  findingTitle?: string;
  severity: string;
  daysOverdue: number;
  slaId: string;
}

export interface SlaComplianceDto {
  totalFindings: number;
  withinSla: number;
  breached: number;
  complianceRate: number;
}

// ── Time Tracking ───────────────────────────────────────────────────

export interface TimeEntryDto {
  id: string;
  auditId: string;
  userId?: string;
  hours: number;
  date?: string;
  description?: string;
  category?: string;
}

export interface CreateTimeEntryRequest {
  auditId: string;
  hours: number;
  date?: string;
  description?: string;
  category?: string;
}

export interface TimeEfficiencyDto {
  averageHoursPerAudit: number;
  averageHoursPerFinding: number;
  utilizationRate: number;
}

export interface TimeUtilizationDto {
  members: Array<{ userId: string; name?: string; totalHours: number; billableHours: number; utilizationRate: number }>;
}

// ── Reminders ───────────────────────────────────────────────────────

export interface AuditReminderDto {
  id: string;
  type?: string;
  entityId?: string;
  entityType?: string;
  message?: string;
  dueDate?: string;
}

export interface GenerateRemindersResultDto {
  generated: number;
  reminders: AuditReminderDto[];
}

// ── Templates ───────────────────────────────────────────────────────

export interface AuditTemplateDto {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  content?: Record<string, unknown>;
}

export interface CreateAuditTemplateRequest {
  name: string;
  description?: string;
  type?: string;
  content?: Record<string, unknown>;
}

export interface UpdateAuditTemplateRequest {
  name?: string;
  description?: string;
  type?: string;
  content?: Record<string, unknown>;
}

export interface ApplyTemplateResultDto {
  auditId: string;
  appliedSteps: number;
  message?: string;
}

// ── Cross-Module ────────────────────────────────────────────────────

export interface CrossModuleSyncResultDto {
  synced: boolean;
  targetEntityId?: string;
  message?: string;
}

export interface CrossModuleStatusDto {
  linkedRisks: number;
  linkedCompliance: number;
  syncedFindings: number;
}

// ── CAPA ↔ Risk Treatments ──────────────────────────────────────────

export interface RiskTreatmentDto {
  id: string;
  title?: string;
  riskId?: string;
  status?: string;
  type?: string;
}

// ── Universe ↔ Foundation ───────────────────────────────────────────

export interface FoundationEntityDto {
  id: string;
  name?: string;
  type?: string;
  departmentId?: string;
}

export interface LinkUniverseToFoundationRequest {
  foundationEntityId: string;
  linkType?: string;
}

// ── Evidence ────────────────────────────────────────────────────────

export interface CollectEvidenceRequest {
  auditId?: string;
  controlId?: string;
  title: string;
  type?: string;
  description?: string;
}

export interface CollectEvidenceResultDto {
  evidenceId: string;
  status: string;
  message?: string;
}

// ── Evidence Versions ───────────────────────────────────────────────

export interface EvidenceVersionDto {
  id: string;
  evidenceId: string;
  versionNumber?: number;
  content?: string;
  uploadedBy?: string;
  createdAt?: string;
}

// ── Foundation Lookups ──────────────────────────────────────────────

export interface FoundationUserDto {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  departmentId?: string;
}

export interface FoundationTeamDto {
  id: string;
  name?: string;
  teamCode?: string;
  members?: string[];
}

// ── Finding History ─────────────────────────────────────────────────

export interface FindingHistoryEntryDto {
  id: string;
  findingId: string;
  action: string;
  changedBy?: string;
  changedAt?: string;
  previousStatus?: string;
  newStatus?: string;
}

// ── Finding Assignment ──────────────────────────────────────────────

export interface UpdateFindingAssignmentRequest {
  assignedTo?: string;
  status?: string;
  priority?: string;
}

// ── Audit Packages ──────────────────────────────────────────────────

export interface AuditPackageDto {
  id: string;
  title?: string;
  status?: string;
  auditId?: string;
  createdAt?: string;
  finalizedAt?: string;
  items?: Array<{ id: string; type: string; title: string }>;
}

export interface CreateAuditPackageRequest {
  title?: string;
  auditId?: string;
}

// Re-export MessageResponse for convenience
export type { MessageResponse };
