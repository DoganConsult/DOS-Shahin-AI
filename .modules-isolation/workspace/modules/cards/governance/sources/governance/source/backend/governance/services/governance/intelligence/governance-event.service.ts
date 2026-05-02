import { eventBus } from '../../../ports/events.port';
import type { GovernanceStatus } from '@dos/types/governance';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type GovernanceEntityType =
  | 'framework'
  | 'control'
  | 'maturity_assessment'
  | 'committee'
  | 'meeting'
  | 'decision'
  | 'charter'
  | 'objective'
  | 'board_report'
  | 'gap_analysis'
  | 'policy';

export type GovernanceAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'escalated' | 'approved' | 'rejected' | 'exported'
  | 'framework_adopted' | 'framework_activated' | 'framework_deprecated' | 'framework_archived'
  | 'control_implemented' | 'control_partially_implemented' | 'control_assessed' | 'control_failed' | 'control_waived'
  | 'maturity_assessed' | 'maturity_improved' | 'maturity_regressed' | 'maturity_target_set'
  | 'board_report_generated' | 'board_report_approved' | 'board_report_distributed'
  | 'committee_meeting_recorded' | 'committee_quorum_met' | 'committee_quorum_failed'
  | 'policy_linked' | 'policy_gap_identified' | 'policy_gap_remediated'
  | 'gap_identified' | 'gap_remediated' | 'gap_accepted' | 'gap_escalated'
  | 'assessment_scheduled' | 'assessment_overdue' | 'assessment_completed' | 'assessment_cancelled'
  | 'alignment_checked' | 'alignment_failed' | 'alignment_passed'
  | 'bulk_updated' | 'bulk_imported';

export interface GovernanceEventOptions {
  tenantId: string;
  entityType: GovernanceEntityType;
  entityId: string;
  action: GovernanceAction;
  triggeredBy: string;
  previousState?: GovernanceStatus;
  newState?: GovernanceStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: GovernanceAction): 'info' | 'warning' | 'critical' {
  const criticalActions: GovernanceAction[] = [
    'control_failed', 'maturity_regressed', 'gap_escalated',
    'alignment_failed', 'assessment_overdue', 'committee_quorum_failed',
    'framework_deprecated',
  ];
  const warningActions: GovernanceAction[] = [
    'gap_identified', 'policy_gap_identified', 'control_partially_implemented',
    'maturity_assessed', 'alignment_checked', 'assessment_scheduled',
    'board_report_generated',
  ];
  if (criticalActions.includes(act)) return 'critical';
  if (warningActions.includes(act)) return 'warning';
  return 'info';
}

export function emitGovernanceEvent(opts: GovernanceEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `governance.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'governance',
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

export function emitGovernanceStatusChange(
  tenantId: string, entityType: GovernanceEntityType, entityId: string,
  previousState: GovernanceStatus, newState: GovernanceStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitGovernanceEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitFrameworkAdopted(
  tenantId: string, frameworkId: string, frameworkType: string, frameworkTitle: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'framework', entityId: frameworkId, action: 'framework_adopted', triggeredBy,
    data: { frameworkType, frameworkTitle },
  });
}

export function emitFrameworkActivated(
  tenantId: string, frameworkId: string, frameworkType: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'framework', entityId: frameworkId, action: 'framework_activated', triggeredBy,
    data: { frameworkType },
  });
}

export function emitFrameworkDeprecated(
  tenantId: string, frameworkId: string, frameworkType: string, reason: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'framework', entityId: frameworkId, action: 'framework_deprecated', triggeredBy,
    data: { frameworkType, reason },
  });
}

export function emitControlImplemented(
  tenantId: string, controlId: string, frameworkId: string, controlCode: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'control', entityId: controlId, action: 'control_implemented', triggeredBy,
    data: { frameworkId, controlCode },
  });
}

export function emitControlAssessed(
  tenantId: string, controlId: string, frameworkId: string, controlCode: string,
  previousStatus: string, newStatus: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'control', entityId: controlId, action: 'control_assessed', triggeredBy,
    data: { frameworkId, controlCode, previousStatus, newStatus },
  });
}

export function emitControlFailed(
  tenantId: string, controlId: string, frameworkId: string, controlCode: string,
  riskLevel: string, failureReason: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'control', entityId: controlId, action: 'control_failed', triggeredBy,
    data: { frameworkId, controlCode, riskLevel, failureReason },
  });
}

export function emitControlWaived(
  tenantId: string, controlId: string, frameworkId: string, controlCode: string,
  waiverReason: string, expiryDate: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'control', entityId: controlId, action: 'control_waived', triggeredBy,
    data: { frameworkId, controlCode, waiverReason, expiryDate },
  });
}

export function emitMaturityAssessed(
  tenantId: string, assessmentId: string, frameworkId: string,
  maturityLevel: string, maturityScore: number, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'maturity_assessment', entityId: assessmentId, action: 'maturity_assessed', triggeredBy,
    data: { frameworkId, maturityLevel, maturityScore },
  });
}

export function emitMaturityImproved(
  tenantId: string, assessmentId: string, frameworkId: string,
  previousLevel: string, newLevel: string, previousScore: number, newScore: number, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'maturity_assessment', entityId: assessmentId, action: 'maturity_improved', triggeredBy,
    data: { frameworkId, previousLevel, newLevel, previousScore, newScore, scoreDelta: newScore - previousScore },
  });
}

export function emitMaturityRegressed(
  tenantId: string, assessmentId: string, frameworkId: string,
  previousLevel: string, newLevel: string, previousScore: number, newScore: number,
  regressionReason: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'maturity_assessment', entityId: assessmentId, action: 'maturity_regressed', triggeredBy,
    data: { frameworkId, previousLevel, newLevel, previousScore, newScore, scoreDelta: newScore - previousScore, regressionReason },
  });
}

export function emitBoardReportGenerated(
  tenantId: string, reportId: string, frameworkIds: string[], reportPeriod: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'board_report', entityId: reportId, action: 'board_report_generated', triggeredBy,
    data: { frameworkIds, reportPeriod, frameworkCount: frameworkIds.length },
  });
}

export function emitBoardReportApproved(
  tenantId: string, reportId: string, approvedBy: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'board_report', entityId: reportId, action: 'board_report_approved', triggeredBy,
    data: { approvedBy },
  });
}

export function emitCommitteeMeetingRecorded(
  tenantId: string, meetingId: string, committeeId: string,
  attendeeCount: number, quorumMet: boolean, resolutionsCount: number, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'meeting', entityId: meetingId,
    action: quorumMet ? 'committee_meeting_recorded' : 'committee_quorum_failed',
    triggeredBy,
    data: { committeeId, attendeeCount, quorumMet, resolutionsCount },
  });
}

export function emitPolicyLinked(
  tenantId: string, frameworkId: string, policyId: string, linkType: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'framework', entityId: frameworkId, action: 'policy_linked', triggeredBy,
    data: { policyId, linkType },
  });
}

export function emitGapIdentified(
  tenantId: string, gapId: string, frameworkId: string, controlId: string,
  riskLevel: string, category: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'gap_analysis', entityId: gapId, action: 'gap_identified', triggeredBy,
    data: { frameworkId, controlId, riskLevel, category },
  });
}

export function emitGapRemediated(
  tenantId: string, gapId: string, frameworkId: string, controlId: string,
  remediationDays: number, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'gap_analysis', entityId: gapId, action: 'gap_remediated', triggeredBy,
    data: { frameworkId, controlId, remediationDays },
  });
}

export function emitGapAccepted(
  tenantId: string, gapId: string, frameworkId: string, acceptanceReason: string,
  expiryDate: string, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'gap_analysis', entityId: gapId, action: 'gap_accepted', triggeredBy,
    data: { frameworkId, acceptanceReason, expiryDate },
  });
}

export function emitAssessmentOverdue(
  tenantId: string, assessmentId: string, frameworkId: string, daysPastDue: number, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'maturity_assessment', entityId: assessmentId, action: 'assessment_overdue', triggeredBy,
    data: { frameworkId, daysPastDue },
  });
}

export function emitAlignmentChecked(
  tenantId: string, frameworkId: string, frameworkType: string,
  controlCoverage: number, passed: boolean, triggeredBy: string,
): void {
  emitGovernanceEvent({
    tenantId, entityType: 'framework', entityId: frameworkId,
    action: passed ? 'alignment_passed' : 'alignment_failed',
    triggeredBy,
    data: { frameworkType, controlCoverage, passed },
  });
}
