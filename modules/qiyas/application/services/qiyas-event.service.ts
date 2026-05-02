import { eventBus } from '../../ports/events.port';
import type { QiyasStatus } from '../types/qiyas.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type QiyasEntityType = 'assessment' | 'question_bank' | 'maturity_model' | 'benchmark' | 'domain' | 'response';
export type QiyasAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assessment_started' | 'assessment_completed' | 'assessment_reviewed' | 'assessment_published'
  | 'score_calculated' | 'score_recalculated' | 'target_set' | 'target_updated'
  | 'question_added' | 'question_updated' | 'question_removed'
  | 'response_submitted' | 'response_updated' | 'response_validated'
  | 'benchmark_created' | 'benchmark_published' | 'benchmark_compared'
  | 'model_created' | 'model_updated' | 'model_published'
  | 'domain_scored' | 'gap_identified' | 'improvement_planned'
  | 'escalated' | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface QiyasEventOptions {
  tenantId: string;
  entityType: QiyasEntityType;
  entityId: string;
  action: QiyasAction;
  triggeredBy: string;
  previousState?: QiyasStatus;
  newState?: QiyasStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: QiyasAction): 'info' | 'warning' | 'critical' {
  if (act === 'gap_identified') return 'warning';
  if (act === 'score_calculated' || act === 'assessment_completed') return 'info';
  return 'info';
}

export function emitQiyasEvent(opts: QiyasEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `qiyas.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'qiyas',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitQiyasStatusChange(
  tenantId: string, entityType: QiyasEntityType, entityId: string,
  previousState: QiyasStatus, newState: QiyasStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitQiyasEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitAssessmentStarted(tenantId: string, assessmentId: string, modelCode: string, scope: string, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_started', triggeredBy, data: { modelCode, scope } });
}

export function emitAssessmentCompleted(tenantId: string, assessmentId: string, overallScore: number, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_completed', triggeredBy, newState: 'completed', data: { overallScore } });
}

export function emitScoreCalculated(tenantId: string, assessmentId: string, score: number, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'score_calculated', triggeredBy, data: { score } });
}

export function emitGapIdentified(tenantId: string, assessmentId: string, domain: string, currentScore: number, targetScore: number, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'domain', entityId: assessmentId, action: 'gap_identified', triggeredBy, data: { domain, currentScore, targetScore, gap: targetScore - currentScore } });
}

export function emitBenchmarkPublished(tenantId: string, benchmarkId: string, modelCode: string, respondentCount: number, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'benchmark', entityId: benchmarkId, action: 'benchmark_published', triggeredBy, data: { modelCode, respondentCount } });
}

export function emitResponseSubmitted(tenantId: string, assessmentId: string, respondentId: string, triggeredBy: string): void {
  emitQiyasEvent({ tenantId, entityType: 'response', entityId: assessmentId, action: 'response_submitted', triggeredBy, data: { respondentId } });
}
