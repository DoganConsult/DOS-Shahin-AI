import { eventBus } from '../../../ports/events.port';
import type { PolicyStatus } from '../../../types/policy.types.js';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { safeQuery } from "@dos/db";

export type PolicyEntityType = 'policy' | 'exception' | 'acknowledgment' | 'template' | 'version' | 'framework_mapping';

export type PolicyAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'escalated'
  | 'policy_drafted' | 'policy_reviewed' | 'policy_approved' | 'policy_rejected'
  | 'policy_published' | 'policy_effective' | 'policy_revised' | 'policy_deprecated' | 'policy_archived'
  | 'version_created' | 'version_superseded' | 'version_rolled_back'
  | 'review_scheduled' | 'review_started' | 'review_completed' | 'review_overdue'
  | 'acknowledgment_required' | 'acknowledgment_sent' | 'acknowledgment_received' | 'acknowledgment_overdue'
  | 'exception_requested' | 'exception_granted' | 'exception_rejected' | 'exception_expired'
  | 'framework_linked' | 'framework_unlinked' | 'framework_compliance_checked'
  | 'owner_changed' | 'approver_assigned' | 'reviewer_assigned'
  | 'bulk_updated' | 'exported' | 'imported'
  | 'approved' | 'rejected';

export interface PolicyEventOptions {
  tenantId: string;
  entityType: PolicyEntityType;
  entityId: string;
  action: PolicyAction;
  triggeredBy: string;
  previousState?: PolicyStatus;
  newState?: PolicyStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: PolicyAction): 'info' | 'warning' | 'critical' {
  if (
    act === 'policy_deprecated' ||
    act === 'review_overdue' ||
    act === 'acknowledgment_overdue' ||
    act === 'exception_expired' ||
    act === 'version_rolled_back'
  ) return 'critical';
  if (
    act === 'escalated' ||
    act === 'policy_rejected' ||
    act === 'exception_requested' ||
    act === 'review_scheduled' ||
    act === 'acknowledgment_required' ||
    act === 'exception_granted'
  ) return 'warning';
  return 'info';
}

export function emitPolicyEvent(opts: PolicyEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `policy.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'policy',
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

export function emitPolicyStatusChange(
  tenantId: string, entityType: PolicyEntityType, entityId: string,
  previousState: PolicyStatus, newState: PolicyStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitPolicyEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitPolicyDrafted(tenantId: string, policyId: string, policyType: string, category: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_drafted', triggeredBy, data: { policyType, category } });
}

export function emitPolicyReviewed(tenantId: string, policyId: string, reviewerId: string, outcome: 'approved' | 'needs_revision', triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_reviewed', triggeredBy, data: { reviewerId, outcome } });
}

export function emitPolicyApproved(tenantId: string, policyId: string, approverId: string, approvalLevel: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_approved', triggeredBy, data: { approverId, approvalLevel } });
}

export function emitPolicyRejected(tenantId: string, policyId: string, rejectedBy: string, reason: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_rejected', triggeredBy, data: { rejectedBy, reason } });
}

export function emitPolicyPublished(tenantId: string, policyId: string, version: number, effectiveDate: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_published', triggeredBy, data: { version, effectiveDate } });
}

export function emitPolicyEffective(tenantId: string, policyId: string, version: number, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_effective', triggeredBy, data: { version } });
}

export function emitPolicyRevised(tenantId: string, policyId: string, previousVersion: number, newVersion: number, changeType: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_revised', triggeredBy, data: { previousVersion, newVersion, changeType } });
}

export function emitPolicyDeprecated(tenantId: string, policyId: string, reason: string, supersededBy?: string, triggeredBy?: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'policy_deprecated', triggeredBy: triggeredBy || SYSTEM_JOB_ACTOR, data: { reason, supersededBy } });
}

export function emitVersionCreated(tenantId: string, policyId: string, version: number, changeType: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'version', entityId: policyId, action: 'version_created', triggeredBy, data: { version, changeType } });
}

export function emitVersionSuperseded(tenantId: string, policyId: string, oldVersion: number, newVersion: number, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'version', entityId: policyId, action: 'version_superseded', triggeredBy, data: { oldVersion, newVersion } });
}

export function emitVersionRolledBack(tenantId: string, policyId: string, fromVersion: number, toVersion: number, reason: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'version', entityId: policyId, action: 'version_rolled_back', triggeredBy, data: { fromVersion, toVersion, reason } });
}

export function emitReviewScheduled(tenantId: string, policyId: string, reviewDate: string, reviewCycleDays: number, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'review_scheduled', triggeredBy, data: { reviewDate, reviewCycleDays } });
}

export function emitReviewOverdue(tenantId: string, policyId: string, reviewDate: string, daysOverdue: number, ownerId: string): void {
  emitPolicyEvent({ tenantId, entityType: 'policy', entityId: policyId, action: 'review_overdue', triggeredBy: SYSTEM_JOB_ACTOR, data: { reviewDate, daysOverdue, ownerId } });
}

export function emitAcknowledgmentRequired(tenantId: string, policyId: string, audience: string[], deadlineDays: number, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'acknowledgment', entityId: policyId, action: 'acknowledgment_required', triggeredBy, data: { audience, deadlineDays } });
}

export function emitAcknowledgmentReceived(tenantId: string, policyId: string, userId: string, acknowledgmentType: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'acknowledgment', entityId: policyId, action: 'acknowledgment_received', triggeredBy, data: { userId, acknowledgmentType } });
}

export function emitAcknowledgmentOverdue(tenantId: string, policyId: string, pendingUsers: number, daysOverdue: number): void {
  emitPolicyEvent({ tenantId, entityType: 'acknowledgment', entityId: policyId, action: 'acknowledgment_overdue', triggeredBy: SYSTEM_JOB_ACTOR, data: { pendingUsers, daysOverdue } });
}

export function emitExceptionGranted(tenantId: string, exceptionId: string, policyId: string, grantedTo: string, expiryDate: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'exception', entityId: exceptionId, action: 'exception_granted', triggeredBy, data: { policyId, grantedTo, expiryDate } });
}

export function emitExceptionRejected(tenantId: string, exceptionId: string, policyId: string, reason: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'exception', entityId: exceptionId, action: 'exception_rejected', triggeredBy, data: { policyId, reason } });
}

export function emitExceptionExpired(tenantId: string, exceptionId: string, policyId: string, grantedTo: string): void {
  emitPolicyEvent({ tenantId, entityType: 'exception', entityId: exceptionId, action: 'exception_expired', triggeredBy: SYSTEM_JOB_ACTOR, data: { policyId, grantedTo } });
}

export function emitFrameworkLinked(tenantId: string, policyId: string, framework: string, controlIds: string[], triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'framework_mapping', entityId: policyId, action: 'framework_linked', triggeredBy, data: { framework, controlIds } });
}

export function emitFrameworkUnlinked(tenantId: string, policyId: string, framework: string, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'framework_mapping', entityId: policyId, action: 'framework_unlinked', triggeredBy, data: { framework } });
}

export function emitFrameworkComplianceChecked(tenantId: string, policyId: string, framework: string, complianceScore: number, gaps: number, triggeredBy: string): void {
  emitPolicyEvent({ tenantId, entityType: 'framework_mapping', entityId: policyId, action: 'framework_compliance_checked', triggeredBy, data: { framework, complianceScore, gaps } });
}
