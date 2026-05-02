/**
 * Governance AI Event Publishers — AGRC-OS
 *
 * Publishes domain events that other modules consume for bidirectional integration.
 * Event contract defined in governance_ai.events.ts.
 *
 * Consumers:
 *   - workflow: creates investigation tasks on signal_detected
 *   - policy: triggers policy review on signal_detected
 *   - onboarding: flags risks on signal_detected
 *   - notification: sends alerts on escalation_triggered
 *   - analytics: tracks pipeline metrics on pipeline_completed
 */

import { publish } from '../ports/events.port';
import type { ModuleEventPayload } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

function buildPayload(
  tenantId: string,
  entityId: string,
  eventType: string,
  triggeredBy: string,
  data: Record<string, unknown> = {},
  previousState?: string,
  newState?: string,
): ModuleEventPayload {
  return {
    tenantId,
    entityType: 'governance_ai',
    entityId,
    moduleCode: 'governance-ai',
    triggeredBy,
    timestamp: new Date().toISOString(),
    correlationId: `governance_ai-${entityId}-${Date.now()}`,
    eventVersion: 1,
    previousState,
    newState,
    data,
  };
}

function safePublish(eventType: string, tenantId: string, payload: ModuleEventPayload): void {
  publish((eventType as any), tenantId, payload).catch(catchHandler(EC.EVENT_BUS, {}));
}

// ═══════════════════════════════════════════════════════════════════════════
// Signal Lifecycle Events — consumed by workflow, policy, onboarding
// ═══════════════════════════════════════════════════════════════════════════

export function emitSignalDetected(tenantId: string, signalId: string, data: {
  signalType: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  severity: string;
  confidenceScore: number;
  boardAttentionFlag: boolean;
}): void {
  safePublish('governance_ai.signal_detected', tenantId,
    buildPayload(tenantId, signalId, 'governance_ai.signal_detected', 'system', data, undefined, 'detected'));
}

export function emitSignalInterpreted(tenantId: string, signalId: string, data: {
  issueId: string;
  governanceDomain: string;
  urgency: string;
  riskLevel: string;
  requiresAuthorityReview: boolean;
  requiresHumanApproval: boolean;
  aiPowered: boolean;
}): void {
  safePublish('governance_ai.interpretation_completed', tenantId,
    buildPayload(tenantId, signalId, 'governance_ai.interpretation_completed', 'system', data, 'detected', 'interpreted'));
}

export function emitSignalEscalated(tenantId: string, signalId: string, data: {
  escalationLevel: string;
  targetType: string;
  targetId: string;
  reason: string;
  boardAttention: boolean;
  executiveAttention: boolean;
}): void {
  safePublish('governance_ai.escalation_triggered', tenantId,
    buildPayload(tenantId, signalId, 'governance_ai.escalation_triggered', 'system', data, 'interpreted', 'escalated'));
}

export function emitSignalResolved(tenantId: string, signalId: string, resolvedBy: string): void {
  safePublish('governance_ai.signal_resolved', tenantId,
    buildPayload(tenantId, signalId, 'governance_ai.signal_resolved', resolvedBy, {}, undefined, 'resolved'));
}

export function emitSignalDismissed(tenantId: string, signalId: string, dismissedBy: string, reason?: string): void {
  safePublish('governance_ai.signal_dismissed', tenantId,
    buildPayload(tenantId, signalId, 'governance_ai.signal_dismissed', dismissedBy, { reason }, undefined, 'dismissed'));
}

// ═══════════════════════════════════════════════════════════════════════════
// Recommendation Events
// ═══════════════════════════════════════════════════════════════════════════

export function emitRecommendationGenerated(tenantId: string, recommendationId: string, data: {
  issueId: string;
  recommendationType: string;
  priority: string;
  suggestedOwner: string | null;
  confidence: number;
}): void {
  safePublish('governance_ai.recommendation_generated', tenantId,
    buildPayload(tenantId, recommendationId, 'governance_ai.recommendation_generated', 'system', data));
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline Events — consumed by analytics, observability
// ═══════════════════════════════════════════════════════════════════════════

export function emitPipelineCompleted(tenantId: string, runId: string, data: {
  status: string;
  durationMs: number;
  signalsCreated: number;
  issuesInterpreted: number;
  escalationsCreated: number;
  recommendationsGenerated: number;
  errors: string[];
}): void {
  safePublish('governance_ai.pipeline_completed', tenantId,
    buildPayload(tenantId, runId, 'governance_ai.pipeline_completed', 'system', data));
}

// ═══════════════════════════════════════════════════════════════════════════
// Narrative Events
// ═══════════════════════════════════════════════════════════════════════════

export function emitNarrativeGenerated(tenantId: string, narrativeId: string, data: {
  narrativeType?: string;
  targetAudience?: string;
}): void {
  safePublish('governance_ai.narrative_generated', tenantId,
    buildPayload(tenantId, narrativeId, 'governance_ai.narrative_generated', 'system', data));
}

// ═══════════════════════════════════════════════════════════════════════════
// Health & Score Events
// ═══════════════════════════════════════════════════════════════════════════

export function emitHealthSnapshotCreated(tenantId: string, snapshotId: string, data: {
  overallScore: number;
  grade: string;
  trend: string;
}): void {
  safePublish('governance_ai.health_snapshot_created', tenantId,
    buildPayload(tenantId, snapshotId, 'governance_ai.health_snapshot_created', 'system', data));
}

export function emitScoreRecalculated(tenantId: string, explanationId: string, data: {
  overallScore: number;
  previousScore: number;
  delta: number;
}): void {
  safePublish('governance_ai.score_recalculated', tenantId,
    buildPayload(tenantId, explanationId, 'governance_ai.score_recalculated', 'system', data));
}

// ═══════════════════════════════════════════════════════════════════════════
// Feedback Events
// ═══════════════════════════════════════════════════════════════════════════

export function emitFeedbackSubmitted(tenantId: string, feedbackId: string, data: {
  sourceType: string;
  sourceId: string;
  feedbackType: string;
  userId: string;
}): void {
  safePublish('governance_ai.feedback_submitted', tenantId,
    buildPayload(tenantId, feedbackId, 'governance_ai.feedback_submitted', data.userId, data));
}

// ═══════════════════════════════════════════════════════════════════════════
// Legacy generic event emitters (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export function emitGovernanceAiCreated(tenantId: string, entityId: string, triggeredBy: string, data?: Record<string, unknown>): void {
  safePublish('governance_ai.created', tenantId, buildPayload(tenantId, entityId, 'governance_ai.created', triggeredBy, data, undefined, 'draft'));
}

export function emitGovernanceAiStatusChanged(tenantId: string, entityId: string, fromStatus: string, toStatus: string, triggeredBy: string): void {
  safePublish('governance_ai.status_changed', tenantId, buildPayload(tenantId, entityId, 'governance_ai.status_changed', triggeredBy, {}, fromStatus, toStatus));
}

export function emitGovernanceAiEscalated(tenantId: string, entityId: string, reason: string, triggeredBy: string): void {
  safePublish('governance_ai.escalated', tenantId, buildPayload(tenantId, entityId, 'governance_ai.escalated', triggeredBy, { reason }));
}
