import { eventBus } from '../ports/events.port';
import type { IssuesStatus } from '../types/issues.types';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { safeQuery } from "@dos/db";

export type IssuesEntityType = 'issue' | 'root_cause' | 'corrective_action' | 'risk_link' | 'comment' | 'attachment';
export type IssuesAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'unassigned'
  | 'escalated' | 'de_escalated'
  | 'approved' | 'rejected'
  | 'resolved' | 'verified' | 'reopened' | 'closed'
  | 'sla_breached' | 'sla_warning'
  | 'risk_linked' | 'risk_unlinked'
  | 'duplicate_detected' | 'duplicate_merged'
  | 'root_cause_identified' | 'corrective_action_added'
  | 'comment_added' | 'attachment_added'
  | 'bulk_updated' | 'bulk_transitioned'
  | 'exported' | 'imported';

export interface IssuesEventOptions {
  tenantId: string;
  entityType: IssuesEntityType;
  entityId: string;
  action: IssuesAction;
  triggeredBy: string;
  previousState?: IssuesStatus;
  newState?: IssuesStatus;
  correlationId?: string;
  severity?: string;
  assignedTo?: string;
  sourceModule?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: IssuesAction): 'info' | 'warning' | 'critical' {
  if (act === 'sla_breached' || act === 'escalated') return 'critical';
  if (act === 'sla_warning' || act === 'reopened' || act === 'de_escalated') return 'warning';
  return 'info';
}

export function emitIssuesEvent(opts: IssuesEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `issues.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'issues',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            assignedTo: opts.assignedTo,
            sourceModule: opts.sourceModule,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitIssuesStatusChange(
  tenantId: string, entityType: IssuesEntityType, entityId: string,
  previousState: IssuesStatus, newState: IssuesStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitIssuesEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitIssueAssigned(tenantId: string, issueId: string, assignedTo: string, triggeredBy: string, previousAssignee?: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'assigned', triggeredBy, assignedTo, data: { previousAssignee } });
}

export function emitIssueEscalated(tenantId: string, issueId: string, level: string, reason: string, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'escalated', triggeredBy, data: { level, reason } });
}

export function emitIssueResolved(tenantId: string, issueId: string, rootCauseCategory: string, resolutionTimeHours: number, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'resolved', triggeredBy, data: { rootCauseCategory, resolutionTimeHours } });
}

export function emitIssueVerified(tenantId: string, issueId: string, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'verified', triggeredBy });
}

export function emitIssueReopened(tenantId: string, issueId: string, reason: string, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'reopened', triggeredBy, data: { reason } });
}

export function emitSlaBreach(tenantId: string, issueId: string, severity: string, ageHours: number): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'sla_breached', triggeredBy: SYSTEM_JOB_ACTOR, data: { severity, ageHours } });
}

export function emitRiskLinked(tenantId: string, issueId: string, riskId: string, linkType: string, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'risk_link', entityId: issueId, action: 'risk_linked', triggeredBy, data: { riskId, linkType } });
}

export function emitDuplicateDetected(tenantId: string, issueId: string, duplicateOfId: string, similarity: number): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: issueId, action: 'duplicate_detected', triggeredBy: SYSTEM_JOB_ACTOR, data: { duplicateOfId, similarity } });
}

export function emitBulkTransitioned(tenantId: string, count: number, toStatus: string, triggeredBy: string): void {
  emitIssuesEvent({ tenantId, entityType: 'issue', entityId: 'bulk', action: 'bulk_transitioned', triggeredBy, data: { count, toStatus } });
}
