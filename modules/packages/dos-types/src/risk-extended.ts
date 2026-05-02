/**
 * @dos/types — risk management extended types
 * Covers risk register, treatment plans, scoring, heat maps, appetite
 */

// ── Risk Register ─────────────────────────────────────────────────────────

export type RiskRegisterStatus = 'active' | 'draft' | 'archived' | 'closed';
export type RiskLifecycleStage = 'identification' | 'assessment' | 'treatment' | 'monitoring' | 'closure';
export type RiskOwnerType = 'user' | 'role' | 'team';

export interface RiskRegister {
  registerId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  scope?: string;
  status: RiskRegisterStatus;
  ownerId: string;
  reviewers?: string[];
  approvers?: string[];
  framework?: string;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  riskCount?: number;
  openRisks?: number;
  acceptedRisks?: number;
  mitigatedRisks?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Risk Entry ─────────────────────────────────────────────────────────────

export type RiskEntryStatus = 'identified' | 'assessed' | 'treatment_planned' | 'in_treatment' | 'accepted' | 'mitigated' | 'closed';
export type RiskImpactArea = 'financial' | 'operational' | 'reputational' | 'legal' | 'strategic' | 'health_safety';
export type RiskTreatmentOption = 'mitigate' | 'accept' | 'transfer' | 'avoid';

export interface RiskEntry {
  riskId: string;
  tenantId: string;
  registerId?: string;
  workspaceId?: string;
  status: RiskEntryStatus;
  lifecycleStage: RiskLifecycleStage;
  title: string;
  titleAr?: string;
  description?: string;
  cause?: string;
  consequence?: string;
  category?: string;
  subCategory?: string;
  impactAreas?: RiskImpactArea[];
  entityType?: string;
  entityId?: string;
  ownerId: string;
  ownerType?: RiskOwnerType;
  delegateId?: string;
  identification: RiskIdentification;
  assessment: RiskAssessment;
  treatmentPlan?: RiskTreatment;
  reviews?: RiskReview[];
  controlIds?: string[];
  incidents?: string[];
  linkedRiskIds?: string[];
  regulatoryRefs?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RiskIdentification {
  identifiedBy: string;
  identifiedAt: string;
  source?: 'self_assessment' | 'audit' | 'incident' | 'scenario_analysis' | 'external' | 'automated';
  externalRef?: string;
  assetIds?: string[];
  threatSource?: string;
}

export interface RiskAssessment {
  assessedBy?: string;
  assessedAt?: string;
  methodology?: string;
  inherent: RiskScore;
  residual?: RiskScore;
  controlEffectiveness?: 'very_effective' | 'effective' | 'partially_effective' | 'ineffective';
  impactJustification?: string;
  likelihoodJustification?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface RiskScore {
  likelihood: number;
  likelihoodLabel?: string;
  impact: number;
  impactLabel?: string;
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  financialImpact?: number;
  financialImpactCurrency?: string;
}

export interface RiskTreatment {
  treatmentId: string;
  option: RiskTreatmentOption;
  description?: string;
  acceptanceReason?: string;
  transferDetails?: string;
  avoidanceReason?: string;
  actions?: RiskTreatmentAction[];
  targetResidualScore?: RiskScore;
  targetCompletionDate?: string;
  status: 'planned' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  reviewDate?: string;
  budget?: number;
  budgetCurrency?: string;
}

export interface RiskTreatmentAction {
  actionId: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
  completedAt?: string;
  taskId?: string;
}

// ── Risk Review ────────────────────────────────────────────────────────────

export interface RiskReview {
  reviewId: string;
  riskId: string;
  reviewedBy: string;
  reviewedAt: string;
  decision: 'no_change' | 'reassess' | 'escalate' | 'close' | 'treatment_update';
  notes?: string;
  updatedScores?: Partial<RiskScore>;
  nextReviewDate?: string;
}

// ── Risk Appetite & Tolerance ──────────────────────────────────────────────

export interface RiskAppetite {
  appetiteId: string;
  tenantId: string;
  workspaceId?: string;
  name?: string;
  description?: string;
  category?: string;
  impactArea?: RiskImpactArea;
  appetiteLevel: 'aggressive' | 'moderate' | 'conservative' | 'averse';
  maxScore: number;
  toleranceScore: number;
  qualitativeStatement?: string;
  reviewedAt?: string;
  approvedBy?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ── Risk Heat Map ──────────────────────────────────────────────────────────

export interface RiskHeatMap {
  tenantId: string;
  workspaceId?: string;
  registerId?: string;
  generatedAt: string;
  matrix: HeatMapCell[][];
  rows: number;
  columns: number;
  rowLabel: string;
  columnLabel: string;
  riskCounts: HeatMapSummary;
}

export interface HeatMapCell {
  row: number;
  column: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  color: string;
  riskCount: number;
  riskIds: string[];
}

export interface HeatMapSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

// ── Risk Scenario ──────────────────────────────────────────────────────────

export interface RiskScenario {
  scenarioId: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  threatActors?: string[];
  threatEvents?: string[];
  vulnerabilities?: string[];
  consequences?: string;
  likelihood?: number;
  impact?: number;
  businessProcesses?: string[];
  assetIds?: string[];
  controlIds?: string[];
  maturityRequirements?: string[];
  industryRelevant?: boolean;
  regulatoryTrigger?: string[];
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Risk KPIs ──────────────────────────────────────────────────────────────

export interface RiskKPIs {
  tenantId: string;
  workspaceId?: string;
  period: string;
  totalRisks: number;
  openRisks: number;
  criticalRisks: number;
  highRisks: number;
  overdueReviews: number;
  overdueActions: number;
  acceptedRisks: number;
  mitigatedInPeriod: number;
  identifiedInPeriod: number;
  averageResidualScore: number;
  riskReductionPercent: number;
  lastCalculatedAt: string;
}
