import { eventBus } from '../../ports/events.port';

import type { TaskStatus } from '@dos/types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

// RiskStatus is not in @dos/types, define locally
type RiskStatus = 'identified' | 'assessed' | 'treated' | 'accepted' | 'closed' | 'escalated';

export type RiskEntityType =
  | 'risk'
  | 'assessment'
  | 'treatment'
  | 'kri'
  | 'scenario'
  | 'appetite'
  | 'register';

export type RiskAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'escalated' | 'approved' | 'rejected'
  | 'risk_identified' | 'risk_assessed' | 'risk_accepted' | 'risk_transferred' | 'risk_avoided' | 'risk_mitigated' | 'risk_closed' | 'risk_reopened'
  | 'treatment_planned' | 'treatment_started' | 'treatment_completed' | 'treatment_failed' | 'treatment_overdue'
  | 'kri_threshold_breached' | 'kri_threshold_warning' | 'kri_threshold_normal' | 'kri_updated'
  | 'reassessment_due' | 'reassessment_completed' | 'reassessment_overdue'
  | 'appetite_exceeded' | 'appetite_updated' | 'appetite_threshold_warning'
  | 'score_changed' | 'residual_score_updated' | 'inherent_score_updated'
  | 'owner_changed' | 'category_changed'
  | 'linked_control_added' | 'linked_incident_raised'
  | 'bulk_updated' | 'exported' | 'imported';

export interface RiskEventOptions {
  tenantId: string;
  entityType: RiskEntityType;
  entityId: string;
  action: RiskAction;
  triggeredBy: string;
  previousState?: RiskStatus;
  newState?: RiskStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(action: RiskAction): 'info' | 'warning' | 'critical' {
  if (
    action === 'kri_threshold_breached' ||
    action === 'appetite_exceeded' ||
    action === 'treatment_failed' ||
    action === 'risk_identified' ||
    action === 'reassessment_overdue' ||
    action === 'treatment_overdue'
  ) return 'critical';
  if (
    action === 'escalated' ||
    action === 'kri_threshold_warning' ||
    action === 'appetite_threshold_warning' ||
    action === 'reassessment_due' ||
    action === 'score_changed' ||
    action === 'risk_reopened'
  ) return 'warning';
  return 'info';
}

export function emitRiskEvent(opts: RiskEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `risk.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'risk',
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

export function emitRiskStatusChange(
  tenantId: string, entityType: RiskEntityType, entityId: string,
  previousState: RiskStatus, newState: RiskStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitRiskEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitRiskIdentified(
  tenantId: string, riskId: string, category: string, riskScore: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'risk_identified', triggeredBy, data: { category, riskScore } });
}

export function emitRiskAssessed(
  tenantId: string, riskId: string, inherentScore: number, residualScore: number, likelihood: number, impact: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'assessment', entityId: riskId, action: 'risk_assessed', triggeredBy, data: { inherentScore, residualScore, likelihood, impact } });
}

export function emitRiskAccepted(
  tenantId: string, riskId: string, riskScore: number, acceptanceRationale: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'risk_accepted', triggeredBy, data: { riskScore, acceptanceRationale } });
}

export function emitRiskTransferred(
  tenantId: string, riskId: string, transferTo: string, mechanism: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'risk_transferred', triggeredBy, data: { transferTo, mechanism } });
}

export function emitRiskAvoided(
  tenantId: string, riskId: string, avoidanceRationale: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'risk_avoided', triggeredBy, data: { avoidanceRationale } });
}

export function emitRiskMitigated(
  tenantId: string, riskId: string, residualScore: number, mitigationSummary: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'risk_mitigated', triggeredBy, data: { residualScore, mitigationSummary } });
}

export function emitTreatmentPlanned(
  tenantId: string, riskId: string, treatmentType: string, dueDate: string, ownerId: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'treatment', entityId: riskId, action: 'treatment_planned', triggeredBy, data: { treatmentType, dueDate, ownerId } });
}

export function emitTreatmentStarted(
  tenantId: string, riskId: string, treatmentType: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'treatment', entityId: riskId, action: 'treatment_started', triggeredBy, data: { treatmentType } });
}

export function emitTreatmentCompleted(
  tenantId: string, riskId: string, treatmentType: string, residualScore: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'treatment', entityId: riskId, action: 'treatment_completed', triggeredBy, data: { treatmentType, residualScore } });
}

export function emitTreatmentFailed(
  tenantId: string, riskId: string, treatmentType: string, failureReason: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'treatment', entityId: riskId, action: 'treatment_failed', triggeredBy, data: { treatmentType, failureReason } });
}

export function emitTreatmentOverdue(
  tenantId: string, riskId: string, dueDate: string, daysOverdue: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'treatment', entityId: riskId, action: 'treatment_overdue', triggeredBy, data: { dueDate, daysOverdue } });
}

export function emitKriThresholdBreached(
  tenantId: string, kriId: string, kriName: string, currentValue: number, thresholdValue: number, category: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'kri', entityId: kriId, action: 'kri_threshold_breached', triggeredBy, data: { kriName, currentValue, thresholdValue, category, exceedancePercent: Math.round(((currentValue - thresholdValue) / thresholdValue) * 100) } });
}

export function emitKriThresholdWarning(
  tenantId: string, kriId: string, kriName: string, currentValue: number, warningThreshold: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'kri', entityId: kriId, action: 'kri_threshold_warning', triggeredBy, data: { kriName, currentValue, warningThreshold } });
}

export function emitKriThresholdNormal(
  tenantId: string, kriId: string, kriName: string, currentValue: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'kri', entityId: kriId, action: 'kri_threshold_normal', triggeredBy, data: { kriName, currentValue } });
}

export function emitReassessmentDue(
  tenantId: string, riskId: string, lastAssessedAt: string, daysSinceAssessment: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'assessment', entityId: riskId, action: 'reassessment_due', triggeredBy, data: { lastAssessedAt, daysSinceAssessment } });
}

export function emitReassessmentCompleted(
  tenantId: string, riskId: string, previousScore: number, newScore: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'assessment', entityId: riskId, action: 'reassessment_completed', triggeredBy, data: { previousScore, newScore, scoreDelta: newScore - previousScore } });
}

export function emitReassessmentOverdue(
  tenantId: string, riskId: string, daysOverdue: number, riskScore: number, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'assessment', entityId: riskId, action: 'reassessment_overdue', triggeredBy, data: { daysOverdue, riskScore } });
}

export function emitAppetiteExceeded(
  tenantId: string, riskId: string, riskScore: number, appetiteThreshold: number, category: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'appetite', entityId: riskId, action: 'appetite_exceeded', triggeredBy, data: { riskScore, appetiteThreshold, exceedanceAmount: riskScore - appetiteThreshold, category } });
}

export function emitScoreChanged(
  tenantId: string, riskId: string, previousScore: number, newScore: number, scoreType: 'inherent' | 'residual' | 'risk', triggeredBy: string,
): void {
  const action: RiskAction = scoreType === 'residual' ? 'residual_score_updated' : scoreType === 'inherent' ? 'inherent_score_updated' : 'score_changed';
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action, triggeredBy, data: { previousScore, newScore, scoreDelta: newScore - previousScore, scoreType } });
}

export function emitLinkedControlAdded(
  tenantId: string, riskId: string, controlId: string, controlTitle: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'linked_control_added', triggeredBy, data: { controlId, controlTitle } });
}

export function emitLinkedIncidentRaised(
  tenantId: string, riskId: string, incidentId: string, incidentTitle: string, triggeredBy: string,
): void {
  emitRiskEvent({ tenantId, entityType: 'risk', entityId: riskId, action: 'linked_incident_raised', triggeredBy, data: { incidentId, incidentTitle } });
}
