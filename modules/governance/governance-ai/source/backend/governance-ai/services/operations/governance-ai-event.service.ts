import { eventBus } from '../../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type GovernanceAiEntityType = 'signal' | 'interpretation' | 'escalation' | 'recommendation' | 'narrative' | 'pipeline_run';
export type GovernanceAiAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'signal_detected' | 'interpretation_completed' | 'escalation_triggered'
  | 'recommendation_generated' | 'narrative_generated' | 'pipeline_completed'
  | 'health_snapshot_created' | 'score_recalculated' | 'feedback_submitted'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface GovernanceAiEventOptions {
  tenantId: string;
  entityType: GovernanceAiEntityType;
  entityId: string;
  action: GovernanceAiAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: GovernanceAiAction): 'info' | 'warning' | 'critical' {
  if (act === 'escalation_triggered') return 'critical';
  if (act === 'score_recalculated' || act === 'escalated') return 'warning';
  return 'info';
}

export function emitGovernanceAiEvent(opts: GovernanceAiEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `governance_ai.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'governance-ai',
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

export function emitGovernanceAiStatusChange(
  tenantId: string, entityType: GovernanceAiEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitGovernanceAiEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitSignalDetected(tenantId: string, signalId: string, signalType: string, triggeredBy: string): void {
  emitGovernanceAiEvent({ tenantId, entityType: 'signal', entityId: signalId, action: 'signal_detected', triggeredBy, data: { signalType } });
}

export function emitPipelineCompleted(tenantId: string, runId: string, resultCount: number, triggeredBy: string): void {
  emitGovernanceAiEvent({ tenantId, entityType: 'pipeline_run', entityId: runId, action: 'pipeline_completed', triggeredBy, data: { resultCount } });
}

export function emitNarrativeGenerated(tenantId: string, narrativeId: string, scope: string, triggeredBy: string): void {
  emitGovernanceAiEvent({ tenantId, entityType: 'narrative', entityId: narrativeId, action: 'narrative_generated', triggeredBy, data: { scope } });
}

export function emitEscalationTriggered(tenantId: string, escalationId: string, severity: string, triggeredBy: string): void {
  emitGovernanceAiEvent({ tenantId, entityType: 'escalation', entityId: escalationId, action: 'escalation_triggered', triggeredBy, data: { severity } });
}
