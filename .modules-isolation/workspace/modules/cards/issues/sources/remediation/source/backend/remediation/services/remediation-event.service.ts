import { eventBus } from '../ports/events.port';
import type { RemediationStatus } from '../types/remediation.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type RemediationEntityType = 'plan' | 'task' | 'verification' | 'milestone';
export type RemediationAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'unassigned'
  | 'started' | 'completed' | 'verified' | 'failed' | 'reopened'
  | 'verification_requested' | 'verification_passed' | 'verification_failed'
  | 'milestone_reached' | 'milestone_missed'
  | 'overdue_detected' | 'due_soon_warning' | 'sla_breached'
  | 'escalated' | 'priority_changed'
  | 'evidence_attached' | 'finding_linked' | 'control_linked'
  | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface RemediationEventOptions {
  tenantId: string;
  entityType: RemediationEntityType;
  entityId: string;
  action: RemediationAction;
  triggeredBy: string;
  previousState?: RemediationStatus;
  newState?: RemediationStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: RemediationAction): 'info' | 'warning' | 'critical' {
  if (act === 'verification_failed' || act === 'sla_breached' || act === 'failed') return 'critical';
  if (act === 'overdue_detected' || act === 'due_soon_warning' || act === 'milestone_missed' || act === 'reopened') return 'warning';
  return 'info';
}

export function emitRemediationEvent(opts: RemediationEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `remediation.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'remediation',
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

export function emitRemediationStatusChange(
  tenantId: string, entityType: RemediationEntityType, entityId: string,
  previousState: RemediationStatus, newState: RemediationStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitRemediationEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitVerificationRequested(tenantId: string, planId: string, verificationMethod: string, triggeredBy: string): void {
  emitRemediationEvent({ tenantId, entityType: 'plan', entityId: planId, action: 'verification_requested', triggeredBy, data: { verificationMethod } });
}

export function emitVerificationPassed(tenantId: string, planId: string, verifiedBy: string, triggeredBy: string): void {
  emitRemediationEvent({ tenantId, entityType: 'verification', entityId: planId, action: 'verification_passed', triggeredBy, newState: 'verified', data: { verifiedBy } });
}

export function emitVerificationFailed(tenantId: string, planId: string, failureReason: string, triggeredBy: string): void {
  emitRemediationEvent({ tenantId, entityType: 'verification', entityId: planId, action: 'verification_failed', triggeredBy, newState: 'failed', data: { failureReason } });
}

export function emitMilestoneReached(tenantId: string, planId: string, milestoneId: string, milestoneName: string, triggeredBy: string): void {
  emitRemediationEvent({ tenantId, entityType: 'milestone', entityId: planId, action: 'milestone_reached', triggeredBy, data: { milestoneId, milestoneName } });
}

export function emitFindingLinked(tenantId: string, planId: string, findingId: string, sourceModule: string, triggeredBy: string): void {
  emitRemediationEvent({ tenantId, entityType: 'plan', entityId: planId, action: 'finding_linked', triggeredBy, data: { findingId, sourceModule } });
}
