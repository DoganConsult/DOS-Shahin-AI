/**
 * Governance API DTOs — AI & Cross-Module Sub-Domain
 * Covers: AI Governance, Governance OS, Digests, Leadership,
 *         Initiatives, Orchestrator, Milestones, Governance Hooks,
 *         Escalation Thresholds
 */

// ── AI Governance ───────────────────────────────────────────────────

export interface AiScanResultDto {
  scannedAt: string;
  signalsFound: number;
  issuesDetected: number;
}

export interface AiSignalDto {
  id: string;
  type?: string;
  source?: string;
  severity?: string;
  message?: string;
  detectedAt?: string;
  interpreted?: boolean;
}

export interface AiIssueDto {
  id: string;
  signalId?: string;
  title?: string;
  severity?: string;
  status?: string;
  description?: string;
}

export interface AiRecommendationDto {
  id: string;
  issueId?: string;
  title?: string;
  description?: string;
  status?: string;
  impact?: string;
}

export interface AiInterpretationResultDto {
  interpretedCount: number;
  issues: AiIssueDto[];
}

export interface AiRecommendationGenerationResultDto {
  generatedCount: number;
  recommendations: AiRecommendationDto[];
}

export interface AiEscalationScanResultDto {
  escalatedCount: number;
  escalations: Array<{ id: string; issueId: string; level: string; reason: string }>;
}

export interface AiBoardAttentionDto {
  items: Array<{ id: string; title: string; severity: string; type: string }>;
}

export interface AiExecutiveAttentionDto {
  items: Array<{ id: string; title: string; severity: string; type: string }>;
}

export interface AiScoreExplanationDto {
  overallScore: number;
  explanation: string;
  factors: Array<{ name: string; contribution: number; description?: string }>;
}

export interface AiNarrativeDto {
  narrative: string;
  generatedAt?: string;
}

export interface SubmitAiFeedbackRequest {
  recommendationId?: string;
  signalId?: string;
  rating: number;
  comment?: string;
}

export interface AiFeedbackStatsDto {
  totalFeedback: number;
  averageRating: number;
  feedbackItems?: Array<{ id: string; rating: number; comment?: string; createdAt?: string }>;
}

export interface AiRunHistoryDto {
  runs: Array<{ id: string; type: string; status: string; startedAt: string; completedAt?: string; summary?: string }>;
}

export interface AiFullCycleResultDto {
  runId: string;
  signalsFound: number;
  issuesDetected: number;
  recommendationsGenerated: number;
  escalationsTriggered: number;
}

// ── Governance Hooks (Cross-Module Actions) ─────────────────────────

export interface CreateActionFromSourceRequest {
  sourceId: string;
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
}

export interface GovernanceActionDto {
  id: string;
  sourceType: string;
  sourceId: string;
  title?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  createdAt?: string;
}

export interface ActionsBySourceDto {
  actions: GovernanceActionDto[];
  totalCount: number;
}

export interface SourceSummaryDto {
  sources: Array<{ sourceType: string; count: number; openCount: number }>;
}

// ── Governance OS (Cross-Module) ────────────────────────────────────

export interface GovernanceStatusDto {
  overallHealth: number;
  modulesStatus: Array<{ module: string; status: string; score: number }>;
}

export interface GovernanceRiskPostureDto {
  overallRiskScore: number;
  categories: Array<{ name: string; score: number; trend: string }>;
}

export interface IamLogEntryDto {
  id: string;
  action: string;
  userId?: string;
  targetId?: string;
  timestamp?: string;
}

export interface AuditLedgerEntryDto {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  timestamp?: string;
}

export interface CrossModuleSummaryDto {
  modules: Array<{ module: string; openItems: number; overdueItems: number; score: number }>;
}

export interface GovernanceQiyasDimensionDto {
  dimension: string;
  score: number;
  maxScore: number;
  maturityLevel?: string;
}

export interface EscalationThresholdDto {
  id: string;
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
}

// ── Digests ─────────────────────────────────────────────────────────

export interface DigestDto {
  id: string;
  type?: string;
  content?: string;
  generatedAt?: string;
  periodHours?: number;
}

export interface GenerateDigestRequest {
  type?: string;
  periodHours?: number;
}

// ── Leadership ──────────────────────────────────────────────────────

export interface LeadershipSummaryDto {
  keyMetrics: Array<{ metric: string; value: number; trend: string }>;
  topIssues: Array<{ id: string; title: string; severity: string }>;
  recommendations: Array<{ id: string; title: string; priority: string }>;
}

// ── Initiatives ─────────────────────────────────────────────────────

export interface InitiativeDto {
  id: string;
  title?: string;
  module?: string;
  status?: string;
  progress?: number;
  dueDate?: string;
}

// ── Orchestrator ────────────────────────────────────────────────────

export interface OrchestratorRunDto {
  id: string;
  module?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  stepsCompleted?: number;
}

export interface OrchestratorTriggerResultDto {
  runId: string;
  status: string;
  message?: string;
}

// ── Milestones ──────────────────────────────────────────────────────

export interface MilestoneInstanceDto {
  id: string;
  milestoneKey?: string;
  module?: string;
  status?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface MilestoneRollupDto {
  modules: Array<{ module: string; total: number; completed: number; overdue: number }>;
}

export interface MilestoneEvaluationResultDto {
  evaluatedCount: number;
  milestones: MilestoneInstanceDto[];
}
