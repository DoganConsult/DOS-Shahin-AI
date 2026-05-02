import { eventBus } from '../../../ports/events.port';
import type { VendorStatus } from '@dos/types/vendor';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { safeQuery } from "@dos/db";

export type VendorEntityType = 'vendor' | 'assessment' | 'contract' | 'due_diligence' | 'sla';

export type VendorAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'escalated'
  | 'approved' | 'rejected' | 'exported'
  | 'onboarded' | 'activated' | 'suspended' | 'terminated' | 'offboarded'
  | 'watch_listed' | 'reinstated'
  | 'risk_rating_changed' | 'risk_rating_elevated' | 'risk_rating_lowered'
  | 'breach_reported' | 'incident_linked'
  | 'assessment_initiated' | 'assessment_submitted' | 'assessment_reviewed' | 'assessment_overdue' | 'assessment_failed'
  | 'due_diligence_started' | 'due_diligence_completed' | 'due_diligence_overdue'
  | 'contract_created' | 'contract_renewed' | 'contract_amended' | 'contract_expired' | 'contract_terminated'
  | 'sla_breach' | 'sla_warning'
  | 'questionnaire_sent' | 'questionnaire_completed'
  | 'bulk_updated';

export interface VendorEventOptions {
  tenantId: string;
  entityType: VendorEntityType;
  entityId: string;
  action: VendorAction;
  triggeredBy: string;
  previousState?: VendorStatus;
  newState?: VendorStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: VendorAction): 'info' | 'warning' | 'critical' {
  if (act === 'suspended' || act === 'terminated' || act === 'breach_reported' || act === 'risk_rating_elevated' || act === 'assessment_failed') return 'critical';
  if (act === 'watch_listed' || act === 'contract_expired' || act === 'assessment_overdue' || act === 'sla_breach' || act === 'due_diligence_overdue' || act === 'risk_rating_changed') return 'warning';
  return 'info';
}

export function emitVendorEvent(opts: VendorEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `vendor.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'vendor',
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

export function emitVendorStatusChange(
  tenantId: string, entityType: VendorEntityType, entityId: string,
  previousState: VendorStatus, newState: VendorStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitVendorEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitVendorSuspended(tenantId: string, vendorId: string, reason: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: 'suspended', triggeredBy, data: { reason } });
}

export function emitVendorTerminated(tenantId: string, vendorId: string, reason: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: 'terminated', triggeredBy, data: { reason } });
}

export function emitVendorWatchListed(tenantId: string, vendorId: string, reason: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: 'watch_listed', triggeredBy, data: { reason } });
}

export function emitVendorReinstated(tenantId: string, vendorId: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: 'reinstated', triggeredBy });
}

export function emitRiskRatingChanged(
  tenantId: string, vendorId: string,
  previousRating: string, newRating: string, triggeredBy: string,
): void {
  const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, unrated: 0 };
  const elevated = (riskOrder[newRating] || 0) > (riskOrder[previousRating] || 0);
  const ratingAction: VendorAction = elevated ? 'risk_rating_elevated' : 'risk_rating_lowered';
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: ratingAction, triggeredBy, data: { previousRating, newRating } });
}

export function emitBreachReported(tenantId: string, vendorId: string, breachType: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'vendor', entityId: vendorId, action: 'breach_reported', triggeredBy, data: { breachType } });
}

export function emitAssessmentInitiated(tenantId: string, assessmentId: string, vendorId: string, assessmentType: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_initiated', triggeredBy, data: { vendorId, assessmentType } });
}

export function emitAssessmentSubmitted(tenantId: string, assessmentId: string, vendorId: string, score: number, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_submitted', triggeredBy, data: { vendorId, score } });
}

export function emitAssessmentOverdue(tenantId: string, assessmentId: string, vendorId: string, daysPastDue: number): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_overdue', triggeredBy: SYSTEM_JOB_ACTOR, data: { vendorId, daysPastDue } });
}

export function emitAssessmentFailed(tenantId: string, assessmentId: string, vendorId: string, score: number, threshold: number, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_failed', triggeredBy, data: { vendorId, score, threshold } });
}

export function emitDueDiligenceStarted(tenantId: string, ddId: string, vendorId: string, ddType: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'due_diligence', entityId: ddId, action: 'due_diligence_started', triggeredBy, data: { vendorId, ddType } });
}

export function emitDueDiligenceCompleted(tenantId: string, ddId: string, vendorId: string, findings: number, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'due_diligence', entityId: ddId, action: 'due_diligence_completed', triggeredBy, data: { vendorId, findings } });
}

export function emitDueDiligenceOverdue(tenantId: string, ddId: string, vendorId: string, daysPastDue: number): void {
  emitVendorEvent({ tenantId, entityType: 'due_diligence', entityId: ddId, action: 'due_diligence_overdue', triggeredBy: SYSTEM_JOB_ACTOR, data: { vendorId, daysPastDue } });
}

export function emitContractExpired(tenantId: string, contractId: string, vendorId: string, expiredDaysAgo: number): void {
  emitVendorEvent({ tenantId, entityType: 'contract', entityId: contractId, action: 'contract_expired', triggeredBy: SYSTEM_JOB_ACTOR, data: { vendorId, expiredDaysAgo } });
}

export function emitContractRenewed(tenantId: string, contractId: string, vendorId: string, newEndDate: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'contract', entityId: contractId, action: 'contract_renewed', triggeredBy, data: { vendorId, newEndDate } });
}

export function emitContractTerminated(tenantId: string, contractId: string, vendorId: string, reason: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'contract', entityId: contractId, action: 'contract_terminated', triggeredBy, data: { vendorId, reason } });
}

export function emitSlaBreached(tenantId: string, vendorId: string, slaType: string, hoursOverdue: number): void {
  emitVendorEvent({ tenantId, entityType: 'sla', entityId: vendorId, action: 'sla_breach', triggeredBy: SYSTEM_JOB_ACTOR, data: { slaType, hoursOverdue } });
}

export function emitSlaWarning(tenantId: string, vendorId: string, slaType: string, hoursRemaining: number): void {
  emitVendorEvent({ tenantId, entityType: 'sla', entityId: vendorId, action: 'sla_warning', triggeredBy: SYSTEM_JOB_ACTOR, data: { slaType, hoursRemaining } });
}

export function emitQuestionnaireSent(tenantId: string, vendorId: string, questionnaireId: string, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: questionnaireId, action: 'questionnaire_sent', triggeredBy, data: { vendorId } });
}

export function emitQuestionnaireCompleted(tenantId: string, vendorId: string, questionnaireId: string, completionRate: number, triggeredBy: string): void {
  emitVendorEvent({ tenantId, entityType: 'assessment', entityId: questionnaireId, action: 'questionnaire_completed', triggeredBy, data: { vendorId, completionRate } });
}
