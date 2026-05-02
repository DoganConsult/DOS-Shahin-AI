/**
 * GRC Operations — Onboarding, Dashboard & Analytics DTOs
 */

// ── Onboarding ──

export interface StartOnboardingAssessmentResultDto {
  assessmentId: string;
  status?: string;
}

export interface OnboardingResponseItem {
  questionId: string;
  answer: string | number | boolean | Record<string, unknown>;
  score?: number;
}

export interface CompletePhase1ResultDto {
  assessmentId: string;
  score?: number;
  recommendations?: string[];
}

export interface IntelligenceReportDto {
  assessmentId: string;
  findings: Array<{ area: string; score: number; recommendation: string }>;
  overallScore?: number;
  maturityLevel?: string;
}

export interface BuildWorkspaceRequest {
  assessmentId: string;
  orgName?: string;
  industry?: string;
  orgSize?: string;
  regions?: string[];
}

export interface BuildWorkspaceResultDto {
  jobId: string;
  seedId?: string;
  workspace: {
    evidenceTaskCount?: number;
    planItemCount?: number;
    [key: string]: unknown;
  };
}

export interface SaveAssessmentDraftRequest {
  assessmentId: string;
  answers: Record<string, unknown>;
  activeCategoryKey: string;
  currentQuestionIndex: number;
  completionPercent: number;
}

export interface AssessmentDraftDto {
  assessmentId: string;
  answers: Record<string, unknown>;
  activeCategoryKey?: string;
  currentQuestionIndex?: number;
  completionPercent?: number;
  lastSavedAt?: string;
}

export interface ConsensusStatusDto {
  status: string;
  reviewers?: Array<{ userId: string; decision?: string; comments?: string }>;
  completedAt?: string;
}

// ── Dashboard ──

export interface DashboardConfigDto {
  widgets: Array<{ id: string; type: string; position: { x: number; y: number; w: number; h: number }; config?: Record<string, unknown> }>;
  layout?: string;
}

export interface KPITrendItemDto {
  date: string;
  metric: string;
  value: number;
}

export interface DashboardZoneDto {
  cards: Array<{ id: string; title: string; value: number | string; trend?: string; icon?: string }>;
  charts?: Array<{ id: string; type: string; data: Record<string, unknown> }>;
}

// ── Analytics ──

export interface AnalyticsKPIDto {
  kpis: Array<{ key: string; value: number; trend: string }>;
  [key: string]: unknown;
}

export interface AnalyticsPredictionDto {
  predictions: Array<{ metric: string; currentValue: number; predictedValue: number; confidence: number }>;
}

export interface BenchmarkDto {
  tenantKPIs: Record<string, number>;
  percentiles: Record<string, number>;
  industryAvg: Record<string, number>;
  sampleSize: number;
}

export interface MaturityDto {
  level: string;
  aggregate: number;
  criteria: Record<string, number>;
}
