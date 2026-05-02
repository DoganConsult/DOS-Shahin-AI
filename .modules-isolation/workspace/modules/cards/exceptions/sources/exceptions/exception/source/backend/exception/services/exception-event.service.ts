import { eventBus } from '../ports/events.port';
import type { ExceptionStatus } from '../types/exception.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ExceptionEntityType = 'exception_request' | 'renewal' | 'compensating_control';
export type ExceptionAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revoked'
  | 'activated' | 'expired' | 'expiry_warning' | 'expiry_critical'
  | 'renewal_requested' | 'renewal_approved' | 'renewal_denied'
  | 'compensating_control_added' | 'compensating_control_removed' | 'compensating_control_verified'
  | 'risk_accepted' | 'risk_reassessed'
  | 'escalated' | 'assigned' | 'reassigned'
  | 'bulk_updated' | 'exported';

export interface ExceptionEventOptions {
  tenantId: string;
  entityType: ExceptionEntityType;
  entityId: string;
  action: ExceptionAction;
  triggeredBy: string;
  previousState?: ExceptionStatus;
  newState?: ExceptionStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ExceptionAction): 'info' | 'warning' | 'critical' {
  if (act === 'expired' || act === 'expiry_critical' || act === 'revoked') return 'critical';
  if (act === 'expiry_warning' || act === 'rejected' || act === 'renewal_denied' || act === 'risk_reassessed') return 'warning';
  return 'info';
}

export function emitExceptionEvent(opts: ExceptionEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `exception.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'exception',
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

export function emitExceptionStatusChange(
  tenantId: string, entityType: ExceptionEntityType, entityId: string,
  previousState: ExceptionStatus, newState: ExceptionStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitExceptionEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitExceptionSubmitted(tenantId: string, exceptionId: string, controlId: string, exceptionType: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'exception_request', entityId: exceptionId, action: 'submitted', triggeredBy, data: { controlId, exceptionType } });
}

export function emitExceptionApproved(tenantId: string, exceptionId: string, approvedBy: string, expiresAt: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'exception_request', entityId: exceptionId, action: 'approved', triggeredBy, newState: 'approved', data: { approvedBy, expiresAt } });
}

export function emitExceptionExpired(tenantId: string, exceptionId: string, controlId: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'exception_request', entityId: exceptionId, action: 'expired', triggeredBy, newState: 'expired', data: { controlId } });
}

export function emitExceptionRevoked(tenantId: string, exceptionId: string, revokedBy: string, reason: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'exception_request', entityId: exceptionId, action: 'revoked', triggeredBy, newState: 'revoked', data: { revokedBy, reason } });
}

export function emitRenewalRequested(tenantId: string, exceptionId: string, newExpiresAt: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'renewal', entityId: exceptionId, action: 'renewal_requested', triggeredBy, data: { newExpiresAt } });
}

export function emitCompensatingControlAdded(tenantId: string, exceptionId: string, controlDescription: string, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'compensating_control', entityId: exceptionId, action: 'compensating_control_added', triggeredBy, data: { controlDescription } });
}

export function emitExpiryWarning(tenantId: string, exceptionId: string, daysRemaining: number, triggeredBy: string): void {
  emitExceptionEvent({ tenantId, entityType: 'exception_request', entityId: exceptionId, action: 'expiry_warning', triggeredBy, data: { daysRemaining } });
}
