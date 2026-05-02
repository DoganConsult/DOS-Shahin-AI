import { eventBus } from '../ports/events.port';
import type { PrivacyStatus } from '@dos/types/privacy';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type PrivacyEntityType = 'dsr' | 'pia' | 'consent_record' | 'data_map' | 'breach_record' | 'cross_border_transfer';
export type PrivacyAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'dsr_submitted' | 'dsr_acknowledged' | 'dsr_processing' | 'dsr_completed' | 'dsr_rejected' | 'dsr_overdue'
  | 'pia_initiated' | 'pia_completed' | 'pia_approved' | 'pia_rejected' | 'pia_review_required'
  | 'consent_granted' | 'consent_revoked' | 'consent_expired' | 'consent_renewed'
  | 'data_map_created' | 'data_map_updated' | 'data_map_reviewed'
  | 'breach_detected' | 'breach_assessed' | 'breach_notified' | 'breach_contained' | 'breach_resolved'
  | 'transfer_requested' | 'transfer_approved' | 'transfer_denied' | 'transfer_completed'
  | 'escalated' | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface PrivacyEventOptions {
  tenantId: string;
  entityType: PrivacyEntityType;
  entityId: string;
  action: PrivacyAction;
  triggeredBy: string;
  previousState?: PrivacyStatus;
  newState?: PrivacyStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: PrivacyAction): 'info' | 'warning' | 'critical' {
  if (act === 'breach_detected' || act === 'breach_notified' || act === 'dsr_overdue') return 'critical';
  if (act === 'consent_expired' || act === 'consent_revoked' || act === 'transfer_denied' || act === 'pia_rejected' || act === 'dsr_rejected' || act === 'breach_assessed') return 'warning';
  return 'info';
}

export function emitPrivacyEvent(opts: PrivacyEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `privacy.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'privacy',
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

export function emitPrivacyStatusChange(
  tenantId: string, entityType: PrivacyEntityType, entityId: string,
  previousState: PrivacyStatus, newState: PrivacyStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitPrivacyEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitDsrSubmitted(tenantId: string, dsrId: string, requestType: string, regulation: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'dsr', entityId: dsrId, action: 'dsr_submitted', triggeredBy, data: { requestType, regulation } });
}

export function emitDsrCompleted(tenantId: string, dsrId: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'dsr', entityId: dsrId, action: 'dsr_completed', triggeredBy, newState: 'completed' });
}

export function emitBreachDetected(tenantId: string, breachId: string, severity: string, affectedCount: number, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'breach_record', entityId: breachId, action: 'breach_detected', triggeredBy, data: { severity, affectedCount } });
}

export function emitBreachNotified(tenantId: string, breachId: string, regulatorName: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'breach_record', entityId: breachId, action: 'breach_notified', triggeredBy, data: { regulatorName } });
}

export function emitConsentGranted(tenantId: string, consentId: string, subjectId: string, purpose: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'consent_record', entityId: consentId, action: 'consent_granted', triggeredBy, data: { subjectId, purpose } });
}

export function emitConsentRevoked(tenantId: string, consentId: string, subjectId: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'consent_record', entityId: consentId, action: 'consent_revoked', triggeredBy, data: { subjectId } });
}

export function emitPiaCompleted(tenantId: string, piaId: string, riskLevel: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'pia', entityId: piaId, action: 'pia_completed', triggeredBy, data: { riskLevel } });
}

export function emitTransferRequested(tenantId: string, transferId: string, destination: string, triggeredBy: string): void {
  emitPrivacyEvent({ tenantId, entityType: 'cross_border_transfer', entityId: transferId, action: 'transfer_requested', triggeredBy, data: { destination } });
}
