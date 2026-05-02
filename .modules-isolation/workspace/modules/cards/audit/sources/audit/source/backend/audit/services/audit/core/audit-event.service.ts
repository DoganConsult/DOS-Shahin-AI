import { eventBus } from '../../../ports/events.port';
import { emitAudit } from '../../../ports/soc.port';
import type { AuditStatus } from '../../../types/audit.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AuditEntityType =
  | 'audit'
  | 'finding'
  | 'observation'
  | 'recommendation'
  | 'corrective_action'
  | 'workpaper'
  | 'plan'
  | 'scope'
  | 'evidence';

export type AuditAction =
  | 'audit_initiated'
  | 'audit_planned'
  | 'audit_executed'
  | 'audit_reported'
  | 'audit_closed'
  | 'audit_reopened'
  | 'audit_cancelled'
  | 'scope_changed'
  | 'team_assigned'
  | 'finding_identified'
  | 'finding_assigned'
  | 'finding_remediated'
  | 'finding_verified'
  | 'finding_escalated'
  | 'finding_closed'
  | 'finding_reopened'
  | 'finding_disputed'
  | 'recommendation_issued'
  | 'recommendation_accepted'
  | 'recommendation_rejected'
  | 'recommendation_implemented'
  | 'corrective_action_assigned'
  | 'corrective_action_submitted'
  | 'corrective_action_completed'
  | 'corrective_action_overdue'
  | 'workpaper_drafted'
  | 'workpaper_reviewed'
  | 'workpaper_approved'
  | 'evidence_attached'
  | 'report_drafted'
  | 'report_issued'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'escalated'
  | 'approved'
  | 'rejected'
  | 'exported';

export type AuditEventSeverity = 'info' | 'warning' | 'critical';

const SEVERITY_MAP: Partial<Record<AuditAction, AuditEventSeverity>> = {
  finding_escalated: 'critical',
  corrective_action_overdue: 'critical',
  finding_identified: 'warning',
  audit_reopened: 'warning',
  finding_disputed: 'warning',
  audit_cancelled: 'warning',
  scope_changed: 'warning',
};

export interface AuditEventOptions {
  tenantId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  triggeredBy: string;
  previousState?: AuditStatus;
  newState?: AuditStatus;
  correlationId?: string;
  findingSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  data?: Record<string, unknown>;
}

export function emitAuditEvent(opts: AuditEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `audit.${opts.entityType}.${opts.action}` as string;
    const severity: AuditEventSeverity = SEVERITY_MAP[opts.action] ?? 'info';

    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'audit',
          severity,
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            findingSeverity: opts.findingSeverity,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
    // Mirror to DSOC: every business-audit emission is also a security-
    // audit-relevant event. Severity is mapped from the audit's own
    // severity (critical/high/medium/info → DSOC severity).
    void emitAudit({
      tenantId: opts.tenantId,
      category: 'data_access',
      severity: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'info',
      actor: { type: 'user', id: opts.triggeredBy },
      action: eventType,
      resource: { type: opts.entityType, id: opts.entityId },
      outcome: 'success',
      occurredAt: new Date().toISOString(),
      correlationId,
      attributes: {
        previousState: opts.previousState,
        newState: opts.newState,
        findingSeverity: opts.findingSeverity,
      },
    }).catch(() => { /* swallow — DSOC mirror must not block business audit */ });
  } catch {
    // Non-critical: events are best-effort
  }
}

export function emitAuditStatusChange(
  tenantId: string, entityType: AuditEntityType, entityId: string,
  previousState: AuditStatus, newState: AuditStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitAuditEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitAuditInitiated(
  tenantId: string, auditId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'audit', entityId: auditId, action: 'audit_initiated', triggeredBy, data });
}

export function emitAuditPlanned(
  tenantId: string, auditId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'audit', entityId: auditId, action: 'audit_planned', triggeredBy, data });
}

export function emitAuditExecuted(
  tenantId: string, auditId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'audit', entityId: auditId, action: 'audit_executed', triggeredBy, data });
}

export function emitAuditReported(
  tenantId: string, auditId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'audit', entityId: auditId, action: 'audit_reported', triggeredBy, data });
}

export function emitAuditClosed(
  tenantId: string, auditId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'audit', entityId: auditId, action: 'audit_closed', triggeredBy, data });
}

export function emitScopeChanged(
  tenantId: string, auditId: string, triggeredBy: string,
  previousScope: string, newScope: string,
): void {
  emitAuditEvent({
    tenantId, entityType: 'scope', entityId: auditId, action: 'scope_changed', triggeredBy,
    data: { previousScope, newScope },
  });
}

export function emitFindingIdentified(
  tenantId: string, findingId: string, triggeredBy: string,
  findingSeverity: AuditEventOptions['findingSeverity'],
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'finding', entityId: findingId, action: 'finding_identified', triggeredBy, findingSeverity, data });
}

export function emitFindingAssigned(
  tenantId: string, findingId: string, triggeredBy: string, assigneeId: string,
): void {
  emitAuditEvent({
    tenantId, entityType: 'finding', entityId: findingId, action: 'finding_assigned', triggeredBy,
    data: { assigneeId },
  });
}

export function emitFindingRemediated(
  tenantId: string, findingId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'finding', entityId: findingId, action: 'finding_remediated', triggeredBy, data });
}

export function emitFindingVerified(
  tenantId: string, findingId: string, triggeredBy: string,
  verified: boolean, notes?: string,
): void {
  emitAuditEvent({
    tenantId, entityType: 'finding', entityId: findingId, action: 'finding_verified', triggeredBy,
    data: { verified, notes },
  });
}

export function emitFindingEscalated(
  tenantId: string, findingId: string, triggeredBy: string,
  reason: string, escalatedTo?: string,
): void {
  emitAuditEvent({
    tenantId, entityType: 'finding', entityId: findingId, action: 'finding_escalated', triggeredBy,
    data: { reason, escalatedTo },
  });
}

export function emitRecommendationIssued(
  tenantId: string, recommendationId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'recommendation', entityId: recommendationId, action: 'recommendation_issued', triggeredBy, data });
}

export function emitRecommendationAccepted(
  tenantId: string, recommendationId: string, triggeredBy: string,
): void {
  emitAuditEvent({ tenantId, entityType: 'recommendation', entityId: recommendationId, action: 'recommendation_accepted', triggeredBy });
}

export function emitRecommendationImplemented(
  tenantId: string, recommendationId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'recommendation', entityId: recommendationId, action: 'recommendation_implemented', triggeredBy, data });
}

export function emitCorrectiveActionAssigned(
  tenantId: string, capaId: string, triggeredBy: string, assigneeId: string, dueDate: string,
): void {
  emitAuditEvent({
    tenantId, entityType: 'corrective_action', entityId: capaId, action: 'corrective_action_assigned', triggeredBy,
    data: { assigneeId, dueDate },
  });
}

export function emitCorrectiveActionCompleted(
  tenantId: string, capaId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'corrective_action', entityId: capaId, action: 'corrective_action_completed', triggeredBy, data });
}

export function emitCorrectiveActionOverdue(
  tenantId: string, capaId: string, triggeredBy: string,
  daysOverdue: number,
): void {
  emitAuditEvent({
    tenantId, entityType: 'corrective_action', entityId: capaId, action: 'corrective_action_overdue', triggeredBy,
    data: { daysOverdue },
  });
}

export function emitWorkpaperApproved(
  tenantId: string, workpaperId: string, triggeredBy: string,
  data?: Record<string, unknown>,
): void {
  emitAuditEvent({ tenantId, entityType: 'workpaper', entityId: workpaperId, action: 'workpaper_approved', triggeredBy, data });
}

export function emitReportIssued(
  tenantId: string, auditId: string, triggeredBy: string,
  reportVersion: string, data?: Record<string, unknown>,
): void {
  emitAuditEvent({
    tenantId, entityType: 'audit', entityId: auditId, action: 'report_issued', triggeredBy,
    data: { reportVersion, ...(data || {}) },
  });
}
