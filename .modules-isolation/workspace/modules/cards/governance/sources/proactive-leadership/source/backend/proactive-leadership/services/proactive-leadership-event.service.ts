import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ProactiveLeadershipEntityType = 'config' | 'insight' | 'recommendation' | 'action_plan' | 'assessment';
export type ProactiveLeadershipAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'insight_generated' | 'recommendation_issued' | 'action_plan_created'
  | 'assessment_completed' | 'config_updated' | 'insight_dismissed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface ProactiveLeadershipEventOptions {
  tenantId: string;
  entityType: ProactiveLeadershipEntityType;
  entityId: string;
  action: ProactiveLeadershipAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ProactiveLeadershipAction): 'info' | 'warning' | 'critical' {
  if (act === 'deleted') return 'critical';
  if (act === 'escalated' || act === 'insight_dismissed') return 'warning';
  return 'info';
}

export function emitProactiveLeadershipEvent(opts: ProactiveLeadershipEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `proactive_leadership.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'proactive-leadership',
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

export function emitProactiveLeadershipStatusChange(
  tenantId: string, entityType: ProactiveLeadershipEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitProactiveLeadershipEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitInsightGenerated(tenantId: string, insightId: string, insightType: string, triggeredBy: string): void {
  emitProactiveLeadershipEvent({ tenantId, entityType: 'insight', entityId: insightId, action: 'insight_generated', triggeredBy, data: { insightType } });
}

export function emitRecommendationIssued(tenantId: string, recId: string, priority: string, triggeredBy: string): void {
  emitProactiveLeadershipEvent({ tenantId, entityType: 'recommendation', entityId: recId, action: 'recommendation_issued', triggeredBy, data: { priority } });
}

export function emitAssessmentCompleted(tenantId: string, assessmentId: string, score: number, triggeredBy: string): void {
  emitProactiveLeadershipEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_completed', triggeredBy, data: { score } });
}
