/**
 * Governance AI Module — AGRC-OS
 * 3-stage AI pipeline: Signal Detection → Interpretation → Escalation
 * Plus: Recommendations, Narrative Engine, Health Intelligence, Pipeline Orchestrator
 */
export * from './types/governance-ai.types';
export { runSignalScan } from './services/intelligence/signal-detection.service';
export { interpretSignal, interpretNewSignals, getInterpretationHistory, reinterpretSignal } from './services/intelligence/interpretation.service';
export type { InterpretationResult, DeepInterpretationResult, InterpretationHistoryFilters, BatchInterpretationResult } from './services/intelligence/interpretation.service';
export { runEscalationScan, getBoardAttentionSummary, getExecutiveAttentionSummary, escalateItem, deescalateItem } from './services/intelligence/escalation-engine.service';
export type { EscalationScanResult, EscalationLevel, BoardAttentionSummary, ExecutiveAttentionSummary } from './services/intelligence/escalation-engine.service';
export { generateRecommendations, generateRecommendationsForNewIssues, acceptRecommendation, rejectRecommendation, getRecommendationStats, getRecommendationHistory } from './services/intelligence/action-orchestration.service';
export type { OrchestrationResult, RecommendationDetail, RecommendationStats, RecommendationHistoryItem } from './services/intelligence/action-orchestration.service';
export { generateScoreExplanation, getLatestScoreExplanation, getHealthDashboard, getHealthTrend } from './services/intelligence/health-intelligence.service';
export type { ScoreExplanationResult, AiScoreExplanation, HealthDashboard, HealthDimension, HealthAlert, HealthTrendPoint } from './services/intelligence/health-intelligence.service';
export { submitFeedback, getFeedbackStats, generateNarrativeSummary } from './services/intelligence/narrative-engine.service';
export { runFullPipeline, getPipelineHistory } from './services/operations/governance-ai-pipeline.service';
export type { PipelineResult, PipelineOptions, PipelineStage } from './services/operations/governance-ai-pipeline.service';
