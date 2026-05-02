import { eventBus } from '../../../ports/events.port';

import type { ComplianceStatus } from '@dos/types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ComplianceEntityType =
  | 'program'
  | 'requirement'
  | 'assessment'
  | 'gap'
  | 'remediation'
  | 'regulatory_change'
  | 'certification'
  | 'audit_finding'
  | 'control'
  | 'framework';

export type ComplianceAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'exported'
  | 'program_created' | 'program_assessed' | 'program_compliant' | 'program_non_compliant' | 'program_partially_compliant'
  | 'program_remediation_started' | 'program_archived' | 'program_activated'
  | 'requirement_mapped' | 'requirement_assessed' | 'requirement_failed' | 'requirement_passed' | 'requirement_waived'
  | 'gap_identified' | 'gap_accepted' | 'gap_escalated' | 'gap_closed'
  | 'remediation_started' | 'remediation_completed' | 'remediation_overdue' | 'remediation_verified'
  | 'regulatory_change_detected' | 'regulatory_change_impact_assessed' | 'regulatory_change_applied'
  | 'certification_achieved' | 'certification_renewed' | 'certification_expired' | 'certification_expiring_soon'
  | 'audit_finding_linked' | 'audit_finding_resolved'
  | 'assessment_started' | 'assessment_completed' | 'assessment_score_updated'
  | 'bulk_updated' | 'escalated' | 'approved' | 'rejected';

export interface ComplianceEventOptions {
  tenantId: string;
  entityType: ComplianceEntityType;
  entityId: string;
  action: ComplianceAction;
  triggeredBy: string;
  previousState?: ComplianceStatus;
  newState?: ComplianceStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ComplianceAction): 'info' | 'warning' | 'critical' {
  if (
    act === 'program_non_compliant' ||
    act === 'gap_escalated' ||
    act === 'remediation_overdue' ||
    act === 'certification_expired' ||
    act === 'regulatory_change_detected' ||
    act === 'requirement_failed'
  ) return 'critical';

  if (
    act === 'program_partially_compliant' ||
    act === 'gap_identified' ||
    act === 'certification_expiring_soon' ||
    act === 'regulatory_change_impact_assessed' ||
    act === 'escalated' ||
    act === 'audit_finding_linked'
  ) return 'warning';

  return 'info';
}

export function emitComplianceEvent(opts: ComplianceEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `compliance.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'compliance',
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

export function emitComplianceStatusChange(
  tenantId: string, entityType: ComplianceEntityType, entityId: string,
  previousState: ComplianceStatus, newState: ComplianceStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitComplianceEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitProgramCreated(tenantId: string, programId: string, frameworkCode: string, triggeredBy: string): void {
  emitComplianceEvent({ tenantId, entityType: 'program', entityId: programId, action: 'program_created', triggeredBy, data: { frameworkCode } });
}

export function emitProgramAssessed(tenantId: string, programId: string, assessmentId: string, score: number, triggeredBy: string): void {
  emitComplianceEvent({ tenantId, entityType: 'program', entityId: programId, action: 'program_assessed', triggeredBy, data: { assessmentId, score } });
}

export function emitProgramCompliant(
  tenantId: string, programId: string, frameworkCode: string, complianceRate: number, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'program', entityId: programId, action: 'program_compliant', triggeredBy, data: { frameworkCode, complianceRate } });
}

export function emitProgramNonCompliant(
  tenantId: string, programId: string, frameworkCode: string, openGaps: number, criticalGaps: number, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'program', entityId: programId, action: 'program_non_compliant', triggeredBy, data: { frameworkCode, openGaps, criticalGaps } });
}

export function emitProgramPartiallyCompliant(
  tenantId: string, programId: string, frameworkCode: string, complianceRate: number, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'program', entityId: programId, action: 'program_partially_compliant', triggeredBy, data: { frameworkCode, complianceRate } });
}

export function emitRequirementMapped(
  tenantId: string, requirementId: string, programId: string, frameworkCode: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'requirement', entityId: requirementId, action: 'requirement_mapped', triggeredBy, data: { programId, frameworkCode } });
}

export function emitRequirementAssessed(
  tenantId: string, requirementId: string, assessmentId: string, passed: boolean, triggeredBy: string,
): void {
  const action: ComplianceAction = passed ? 'requirement_passed' : 'requirement_failed';
  emitComplianceEvent({ tenantId, entityType: 'requirement', entityId: requirementId, action, triggeredBy, data: { assessmentId, passed } });
}

export function emitRequirementFailed(
  tenantId: string, requirementId: string, programId: string, reason: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'requirement', entityId: requirementId, action: 'requirement_failed', triggeredBy, data: { programId, reason } });
}

export function emitGapIdentified(
  tenantId: string, gapId: string, programId: string, severity: string, frameworkCode: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'gap', entityId: gapId, action: 'gap_identified', triggeredBy, data: { programId, severity, frameworkCode } });
}

export function emitGapEscalated(
  tenantId: string, gapId: string, programId: string, severity: string, daysOpen: number, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'gap', entityId: gapId, action: 'gap_escalated', triggeredBy, data: { programId, severity, daysOpen } });
}

export function emitRemediationStarted(
  tenantId: string, remediationId: string, gapId: string, programId: string, dueDate: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'remediation', entityId: remediationId, action: 'remediation_started', triggeredBy, data: { gapId, programId, dueDate } });
}

export function emitRemediationCompleted(
  tenantId: string, remediationId: string, gapId: string, programId: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'remediation', entityId: remediationId, action: 'remediation_completed', triggeredBy, data: { gapId, programId } });
}

export function emitRemediationOverdue(
  tenantId: string, remediationId: string, gapId: string, daysOverdue: number, severity: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'remediation', entityId: remediationId, action: 'remediation_overdue', triggeredBy, data: { gapId, daysOverdue, severity } });
}

export function emitRegulatoryChangeDetected(
  tenantId: string, changeId: string, regulatoryBody: string, affectedFrameworks: string[], triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'regulatory_change', entityId: changeId, action: 'regulatory_change_detected', triggeredBy, data: { regulatoryBody, affectedFrameworks } });
}

export function emitRegulatoryChangeImpactAssessed(
  tenantId: string, changeId: string, impactedPrograms: number, criticalImpact: boolean, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'regulatory_change', entityId: changeId, action: 'regulatory_change_impact_assessed', triggeredBy, data: { impactedPrograms, criticalImpact } });
}

export function emitCertificationAchieved(
  tenantId: string, certId: string, frameworkCode: string, expiryDate: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'certification', entityId: certId, action: 'certification_achieved', triggeredBy, data: { frameworkCode, expiryDate } });
}

export function emitCertificationExpired(
  tenantId: string, certId: string, frameworkCode: string, expiredAt: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'certification', entityId: certId, action: 'certification_expired', triggeredBy, data: { frameworkCode, expiredAt } });
}

export function emitCertificationExpiringSoon(
  tenantId: string, certId: string, frameworkCode: string, daysUntilExpiry: number, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'certification', entityId: certId, action: 'certification_expiring_soon', triggeredBy, data: { frameworkCode, daysUntilExpiry } });
}

export function emitAuditFindingLinked(
  tenantId: string, findingId: string, programId: string, severity: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'audit_finding', entityId: findingId, action: 'audit_finding_linked', triggeredBy, data: { programId, severity } });
}

export function emitAssessmentStarted(
  tenantId: string, assessmentId: string, programId: string, assessmentType: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_started', triggeredBy, data: { programId, assessmentType } });
}

export function emitAssessmentCompleted(
  tenantId: string, assessmentId: string, programId: string, score: number, assessmentType: string, triggeredBy: string,
): void {
  emitComplianceEvent({ tenantId, entityType: 'assessment', entityId: assessmentId, action: 'assessment_completed', triggeredBy, data: { programId, score, assessmentType } });
}
