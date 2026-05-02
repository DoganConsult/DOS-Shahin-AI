/**
 * dora -- API Contracts
 * Typed request/response shapes for the module's public API.
 *
 * MP-25 §6.2: Required contracts for obligations, resilience tests,
 * mappings, dashboard, and diagnostics.
 *
 * @owner dora
 * @module dora
 */

// ── Common Types ───────────────────────────────────────────────────────

export interface DoraListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DoraListResponse<T = unknown> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DoraDetailResponse<T = unknown> {
  success: boolean;
  data: T;
}

export interface DoraMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}

// ── Obligation Contracts (MP-25 §6.2) ─────────────────────────────────

export interface DoraObligation {
  obligationId: string;
  title: string;
  pillar: 'ict_risk_management' | 'incident_reporting' | 'resilience_testing' | 'third_party_risk' | 'information_sharing';
  articleReference: string;
  description: string | null;
  ownerId: string | null;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'under_review' | 'approved' | 'active' | 'overdue' | 'expired' | 'archived';
  complianceFrameworkId: string | null;
  evidenceRequirements: string[];
  completionPercentage: number;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoraObligationMapping {
  mappingId: string;
  obligationId: string;
  frameworkId: string | null;
  controlId: string | null;
  riskId: string | null;
  evidenceId: string | null;
  mappingType: 'framework' | 'control' | 'risk' | 'evidence';
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ── Resilience Test Contracts (MP-25 §6.2) ────────────────────────────

export interface DoraResilienceTest {
  testId: string;
  title: string;
  testType: string;
  scope: string;
  description: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  methodology: string | null;
  scopeAssets: string[];
  testPlan: Record<string, unknown>;
  leadAssessorId: string | null;
  targetSystemIds: string[];
  status: 'planned' | 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'archived';
  result: 'pass' | 'partial_pass' | 'fail' | 'inconclusive' | null;
  resultsSummary: Record<string, unknown> | null;
  remediationPlan: Record<string, unknown> | null;
  findingsCount: number;
  score: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoraResilienceResult {
  resultId: string;
  testId: string;
  findingTitle: string;
  findingDescription: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAssetId: string | null;
  remediationSuggestion: string | null;
  evidenceRef: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
}

// ── Mapping Contracts (MP-25 §6.2) ────────────────────────────────────

export interface DoraFrameworkMapping {
  mappingId: string;
  doraArticle: string;
  doraPillar: string;
  frameworkCode: string;
  frameworkControlRef: string;
  coverageLevel: 'full' | 'partial' | 'none';
  notes: string | null;
  gapDescription: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DoraControlMapping {
  mappingId: string;
  doraArticle: string;
  doraPillar: string;
  controlId: string;
  riskId: string | null;
  evidenceIds: string[];
  coverageLevel: 'full' | 'partial' | 'none';
  effectivenessRating: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ── Dashboard Contracts (MP-25 §6.2) ──────────────────────────────────

export interface DoraPillarScore {
  pillar: string;
  pillarLabel: string;
  score: number;
  status: 'critical' | 'at_risk' | 'needs_improvement' | 'good' | 'excellent';
  obligationCount: number;
  activeObligations: number;
  overdueObligations: number;
  coveragePercent: number;
}

export interface DoraReadinessResponse {
  overallScore: number;
  overallStatus: string;
  pillarScores: DoraPillarScore[];
  lastCalculated: string;
}

export interface DoraGapAnalysisResponse {
  uncoveredArticles: string[];
  lowCoveragePillars: { pillar: string; coveragePercent: number }[];
  criticalGaps: { article: string; pillar: string; reason: string }[];
  totalGaps: number;
  overallCoverage: number;
}

export interface DoraTrendPoint {
  date: string;
  score: number;
  obligationsActive: number;
  obligationsOverdue: number;
  testsCompleted: number;
}

export interface DoraEvidenceCoverage {
  totalObligations: number;
  obligationsWithEvidence: number;
  evidenceCoveragePercent: number;
  totalControlMappings: number;
  controlMappingsWithEvidence: number;
  controlEvidencePercent: number;
}

export interface DoraDashboardSummary {
  readiness: DoraReadinessResponse;
  obligationStats: {
    total: number;
    active: number;
    overdue: number;
    completed: number;
    avgCompletion: number;
  };
  resilienceStats: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    failed: number;
    overdue: number;
  };
  gapAnalysis: DoraGapAnalysisResponse;
  evidenceCoverage: DoraEvidenceCoverage;
  assetOverview: Record<string, number>;
}

// ── Diagnostics Contracts (MP-25 §6.2) ────────────────────────────────

export interface DoraDiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: DoraDiagnosticsCheck[];
  checkedAt: string;
}

export interface DoraDiagnosticsCheck {
  name: string;
  passed: boolean;
  detail?: string;
  severity?: 'info' | 'warning' | 'critical';
}

// ── Lifecycle Transition Contract ──────────────────────────────────────

export interface DoraLifecycleTransitionRequest {
  toState: string;
  comment?: string;
}

export interface DoraLifecycleTransitionResponse {
  success: boolean;
  data?: {
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    comment?: string;
  };
  error?: string;
  checks?: Record<string, boolean>;
}

// ── AI Analysis Contracts (MP-25 §8) ──────────────────────────────────

export interface DoraAiRegulatorySummary {
  summary: string;
  keyRequirements: string[];
  complianceImplications: string[];
  recommendedActions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}

export interface DoraAiGapNarration {
  narrative: string;
  prioritizedGaps: { gap: string; priority: string; reasoning: string }[];
  remediationSuggestions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}

export interface DoraAiEvidenceSufficiency {
  assessment: string;
  sufficiencyScore: number;
  missingEvidence: string[];
  suggestions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}
