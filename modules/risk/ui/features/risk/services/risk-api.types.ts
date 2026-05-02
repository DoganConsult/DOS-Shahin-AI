/**
 * Risk API Service DTOs — AGRC-OS
 * Type definitions for risk-api.service.ts endpoints that return
 * domain-specific shapes beyond the risk-workspace page models.
 */

import { MessageResponse } from '@app/core/models/shared.types';

// ── Risk Assessment ─────────────────────────────────────────────────

export interface RiskAssessmentResultDto {
  riskId?: string;
  inherentScore?: number;
  residualScore?: number;
  likelihood?: number;
  impact?: number;
  controlEffectiveness?: number;
  assessedAt?: string;
}

// ── Risk Linkage ────────────────────────────────────────────────────

export interface RiskLinkResultDto {
  success?: boolean;
  message?: string;
  riskId?: string;
  linkedId?: string;
}

// ── Risk Escalation ─────────────────────────────────────────────────

export interface RiskEscalationResultDto {
  success?: boolean;
  message?: string;
  riskId?: string;
  escalateTo?: string;
}

// ── Treatment Validation ────────────────────────────────────────────

export interface TreatmentValidationResultDto {
  success?: boolean;
  message?: string;
  treatmentId?: string;
  validatedBy?: string;
}

// ── Acceptance ──────────────────────────────────────────────────────

export interface AcceptanceRequestResultDto {
  success?: boolean;
  message?: string;
  riskId?: string;
}

export interface AcceptanceApprovalResultDto {
  success?: boolean;
  message?: string;
  riskId?: string;
  decision?: string;
}

// ── Score History ───────────────────────────────────────────────────

export interface RiskScoreHistoryEntryDto {
  historyId?: string;
  riskId?: string;
  score?: number;
  likelihood?: number;
  impact?: number;
  recordedAt?: string;
  source?: string;
}

// ── Risk Dependencies ───────────────────────────────────────────────

export interface RiskDependencyDto {
  riskId?: string;
  title?: string;
  sharedEntityId?: string;
  sharedEntityType?: string;
}

// ── Heatmap Migration ───────────────────────────────────────────────

export interface HeatmapMigrationEntryDto {
  riskId?: string;
  title?: string;
  fromCell?: { likelihood: number; impact: number };
  toCell?: { likelihood: number; impact: number };
  migratedAt?: string;
}

// ── KRI History ─────────────────────────────────────────────────────

export interface KRIDataPointDto {
  date?: string;
  value?: number;
  status?: string;
}

// ── KRI Correlation ─────────────────────────────────────────────────

export interface KRICorrelationDto {
  kriId1?: string;
  kriId2?: string;
  correlationCoefficient?: number;
  strength?: string;
}

// ── Acceptance History ──────────────────────────────────────────────

export interface AcceptanceHistoryEntryDto {
  riskId?: string;
  riskTitle?: string;
  requestedBy?: string;
  decision?: string;
  decidedAt?: string;
}

// ── Appetite Category Gauges ────────────────────────────────────────

export interface AppetiteCategoryGaugeDto {
  category?: string;
  currentLevel?: number;
  threshold?: number;
  status?: string;
}

// ── Peer Review ─────────────────────────────────────────────────────

export interface PeerReviewDto {
  reviewId?: string;
  riskId?: string;
  status?: string;
  agentScore?: number;
  humanScore?: number;
  finalScore?: number;
  finalMethod?: string;
  agentReasoning?: string;
  humanReasoning?: string;
  humanAnalystId?: string;
  dialogue?: PeerReviewDialogueEntryDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PeerReviewDialogueEntryDto {
  from: 'agent' | 'human';
  message: string;
  timestamp?: string;
}

// ── Status Lifecycle ────────────────────────────────────────────────

export interface ValidTransitionsDto {
  currentStatus: string;
  validTransitions: Array<{
    toStatus: string;
    requiredRoles: string[];
    requiredPermission: string;
    slaHours: number | null;
    description: string;
  }>;
}

export interface StatusHistoryDto {
  history: Array<{
    historyId: string;
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedByName: string;
    reason: string;
    changedAt: string;
  }>;
  count: number;
}

// ── Foundation Lookups ──────────────────────────────────────────────

export interface FoundationTeamDto {
  teamId: string;
  name: string;
  teamCode: string;
}

export interface FoundationUserDto {
  userId: string;
  fullName: string;
  email: string;
  roleCode: string;
  departmentName: string;
  businessUnitName: string;
}

export interface FoundationUserDetailDto {
  userId: string;
  fullName?: string;
  email?: string;
  roleCode?: string;
  departmentName?: string;
  businessUnitName?: string;
  teams?: string[];
  permissions?: string[];
}

// ── Status Transition ───────────────────────────────────────────────

export interface StatusTransitionResultDto {
  success?: boolean;
  message?: string;
  riskId?: string;
  newStatus?: string;
}

// ── Bulk Operations ─────────────────────────────────────────────────

export interface BulkDeleteResultDto {
  deleted?: number;
  success?: boolean;
  message?: string;
}

// ── Import ──────────────────────────────────────────────────────────

export interface ImportResultDto {
  imported?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
}

// ═══ Risk Workspace DTOs (migrated from pages/risk-workspace/risk-workspace.models.ts) ═══

export interface RiskSummary {
  totalRisks: number;
  highRisks: number;
  criticalRisks: number;
  overdueTreatments: number;
  appetiteBreaches: number;
  risksWithoutOwner: number;
  reviewedThisCycle: number;
  residualRiskTrend: number;
}

export interface RiskOverviewDto {
  averageRiskScore?: number;
  summary: RiskSummary;
  distribution: {
    byCategory: Array<{ category: string; count: number }>;
    bySeverity: Array<{ severity: string; count: number }>;
    byEntity: Array<{ entity: string; count: number }>;
  };
  topRisks: RiskRegisterItemDto[];
  escalationSummary: EscalationItemDto[];
  trends: RiskTrendDto[];
}

export interface EscalationItemDto {
  type: string;
  count: number;
  label: string;
}

export interface RiskTrendDto {
  date: string;
  highCount: number;
  residualAvg: number;
  appetiteBreaches: number;
  treatmentCompletion: number;
}

export interface RiskRegisterItemDto {
  riskScore?: number;
  riskId: string;
  title: string;
  description?: string;
  source?: string;
  category: string;
  entity?: string;
  owner?: string;
  status: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  controlEffectiveness?: number;
  residualScore: number;
  confidenceLevel?: string;
  treatmentStatus?: string;
  nextReviewDate?: string;
  appetiteStatus?: 'within_appetite' | 'breach' | 'pending_acceptance';
  createdAt?: string;
  updatedAt?: string;
  control_ids?: string[];
  evidence_count?: number;
  ownerId?: string;
  ownerTeamId?: string;
  threatContext?: string;
  businessImpact?: string;
}

export interface RiskDetailDto {
  risk: RiskRegisterItemDto & {
    businessImpact?: string;
    threatContext?: string;
    functionAffected?: string;
    reviewCadence?: string;
    assessmentDate?: string;
  };
  linkedControls: LinkedControlDto[];
  linkedEvidence: LinkedEvidenceDto[];
  linkedObligations: LinkedObligationDto[];
  linkedFindings: LinkedFindingDto[];
  linkedTasks: LinkedTaskDto[];
  treatments: TreatmentItemDto[];
  governance: RiskGovernanceDto;
}

export interface LinkedControlDto {
  controlId: string;
  title: string;
  status: string;
  effectiveness?: number;
}

export interface LinkedEvidenceDto {
  evidenceId: string;
  title: string;
  type: string;
  status: string;
  lastUpdated?: string;
}

export interface LinkedObligationDto {
  obligationId: string;
  code: string;
  title: string;
  framework: string;
}

export interface LinkedFindingDto {
  findingId: string;
  title: string;
  severity: string;
  status: string;
}

export interface LinkedTaskDto {
  taskId: string;
  title: string;
  assignee?: string;
  status: string;
  dueDate?: string;
}

export interface RiskGovernanceDto {
  acceptanceDecision?: string;
  acceptedBy?: string;
  acceptedDate?: string;
  escalationHistory: Array<{ date: string; escalatedTo: string; reason: string; status: string }>;
  approvals: Array<{ approver: string; date: string; decision: string; comments?: string }>;
  reviewTrail: Array<{ date: string; reviewer: string; outcome: string; notes?: string }>;
}

export interface RiskHeatmapDto {
  mode: 'inherent' | 'residual';
  matrixSize?: number;
  cells: HeatmapCellDto[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  labels: {
    likelihood: string[];
    impact: string[];
  };
}

export interface HeatmapCellDto {
  likelihood: number;
  impact: number;
  count: number;
  riskIds: string[];
  risks: Array<{ riskId: string; title: string; status: string; owner?: string }>;
}

export interface TreatmentItemDto {
  treatmentId: string;
  title?: string;
  linkedRiskId: string;
  linkedRiskTitle?: string;
  owner?: string;
  strategy: string;
  targetDate?: string;
  status: string;
  expectedReduction?: number;
  actualReduction?: number;
  overdue: boolean;
  targetResidualScore?: number;
  createdAt?: string;
}

export interface TreatmentDetailDto {
  treatment: TreatmentItemDto & {
    description?: string;
    milestones: TreatmentMilestoneDto[];
    blockers: string[];
    validationEvidence?: string;
    completionReview?: string;
    budgetEstimate?: number;
  };
  linkedRisk: RiskRegisterItemDto;
  linkedControls: LinkedControlDto[];
}

export interface TreatmentMilestoneDto {
  milestoneId: string;
  title: string;
  dueDate?: string;
  status: string;
  assignee?: string;
}

export interface TreatmentBoardDto {
  [key: string]: TreatmentItemDto[];
  planned: TreatmentItemDto[];
  approved: TreatmentItemDto[];
  inProgress: TreatmentItemDto[];
  overdue: TreatmentItemDto[];
  validation: TreatmentItemDto[];
  done: TreatmentItemDto[];
}

export interface TreatmentEffectivenessDto {
  totalTreatments: number;
  effectiveCount: number;
  ineffectiveCount: number;
  pendingValidation: number;
  items: Array<{
    treatmentId: string;
    riskTitle: string;
    plannedReduction: number;
    actualReduction: number;
    effective: boolean;
  }>;
}

export interface KRIItemDto {
  kriId: string;
  name: string;
  linkedRiskId?: string;
  linkedCategory?: string;
  owner?: string;
  threshold: { red: number; amber: number; green: number };
  currentValue: number;
  status: 'normal' | 'warning' | 'breach' | 'breached' | 'any';
  trend: 'up' | 'down' | 'stable';
  lastUpdated?: string;
}

export interface KRITrendChartDto {
  kriId: string;
  name: string;
  dataPoints: Array<{ date: string; value: number }>;
  threshold: { red: number; amber: number; green: number };
}

export interface KRIBreachLogDto {
  breachId: string;
  kriId: string;
  kriName: string;
  breachDate: string;
  value: number;
  threshold: number;
  linkedRiskId?: string;
  owner?: string;
  actionTaken?: string;
  status: string;
}

export interface ReviewCadenceDto {
  totalItems: number;
  onTime: number;
  overdue: number;
  stale: number;
  items: Array<{
    entityId: string;
    entityType: string;
    name: string;
    owner?: string;
    lastReview?: string;
    nextReview?: string;
    status: 'on_time' | 'overdue' | 'stale';
  }>;
}

export interface RiskAppetiteConfigDto {
  appetiteModel?: string;
  thresholdsByCategory: Array<{ category: string; threshold: number; severity: string }>;
  thresholdsBySeverity: Array<{ severity: string; maxResidual: number }>;
  entityThresholds: Array<{ entity: string; threshold: number }>;
  lastApprovalDate?: string;
  approvingAuthority?: string;
}

export interface AppetiteBreachDto {
  riskId: string;
  riskTitle: string;
  category: string;
  residualScore: number;
  appetiteThreshold: number;
  breachAmount: number;
  owner?: string;
  escalationStatus: string;
  acceptanceStatus: string;
}

export interface AcceptanceQueueItemDto {
  riskId: string;
  riskTitle: string;
  category: string;
  residualScore: number;
  requestedBy?: string;
  requestedDate?: string;
  reviewDate?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  comments?: string;
  approvalTrail: Array<{ approver: string; date: string; decision: string; comments?: string }>;
}

export interface AppetiteTrendDto {
  category: string;
  breachCount: number;
  acceptedCount: number;
  unacceptedCount: number;
  trend: 'improving' | 'worsening' | 'stable';
}

// ═══ Feature-local view models (extend canonical DTOs for UI-specific fields) ═══

/** View-model extending PeerReviewDto with agent-decomposed scores used in assessment templates. */
export interface RiskPeerReviewVM extends PeerReviewDto {
  agentLikelihood?: number;
  agentImpact?: number;
}

// ═══ Runtime-boundary types (API responses with variable shape) ═══

/** Wraps API responses that may or may not include a `.data` envelope. */
export interface ApiDataEnvelope<T> {
  data?: T;
}

/** Foundation user record — supports both camelCase and snake_case from API. */
export interface FoundationUserRecord {
  userId?: string;
  user_id?: string;
  id?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  departmentName?: string;
  department_name?: string;
  businessUnitName?: string;
  business_unit_name?: string;
  teamName?: string;
  team_name?: string;
  roleCode?: string;
}

/** Foundation team record — supports both camelCase and snake_case from API. */
export interface FoundationTeamRecord {
  teamId?: string;
  team_id?: string;
  id?: string;
  name?: string;
  team_name?: string;
  teamCode?: string;
  team_code?: string;
}

/** Score history entry from risk scoring API — superset of RiskScoreHistoryEntryDto. */
export interface ScoreHistoryApiRecord {
  date?: string;
  assessedAt?: string;
  createdAt?: string;
  likelihood?: number;
  impact?: number;
  residualScore?: number;
  controlEffectiveness?: number;
  scorer?: string;
  assessedBy?: string;
}

/** Audit finding from external audit API — minimal shape used in risk drawer. */
export interface AuditFindingRecord {
  findingId?: string;
  source_type?: string;
  linked_risk_id?: string;
  title?: string;
  severity?: string;
  status?: string;
  [key: string]: unknown;
}

/** API response from /api/audit/findings. */
export interface AuditFindingsApiResponse {
  findings?: AuditFindingRecord[];
}

/** KRI correlation item from API — different shape from KRICorrelationDto (pairwise stats). */
export interface KRICorrelationApiItem {
  kriId?: string;
  kriName?: string;
  name?: string;
  category?: string;
  linkedCategory?: string;
  linkedRisks?: Array<{ riskId?: string; id?: string; title?: string; name?: string; category?: string; residualScore?: number; score?: number; status?: string }>;
  risks?: Array<{ riskId?: string; id?: string; title?: string; name?: string; category?: string; residualScore?: number; score?: number; status?: string }>;
}

/** Breach log API response — array or object with .log/.breaches. */
export interface BreachLogApiResponse {
  log?: KRIBreachLogDto[];
  breaches?: KRIBreachLogDto[];
}

/** KRI history data point from API. */
export interface KRIHistoryDataPoint {
  date: string;
  value: number;
}

/** KRI history API response. */
export interface KRIHistoryApiResponse {
  dataPoints: KRIHistoryDataPoint[];
  count: number;
}

/** Status history entry from API — supports both camelCase and snake_case. */
export interface StatusHistoryApiRecord {
  historyId?: string;
  history_id?: string;
  fromStatus?: string;
  from_status?: string;
  toStatus?: string;
  to_status?: string;
  changedBy?: string;
  changed_by?: string;
  changedByName?: string;
  changed_by_name?: string;
  changedAt?: string;
  changed_at?: string;
  timestamp?: string;
  created_at?: string;
  reason?: string;
  notes?: string;
}

// Re-export MessageResponse for convenience
export type { MessageResponse };
