import { eventBus } from '../ports/events.port';
import type { RecordsStatus } from '../types/records.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type RecordsEntityType = 'record' | 'retention_policy' | 'retention_schedule' | 'disposal_action' | 'legal_hold' | 'lifecycle_log';
export type RecordsAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'classified' | 'reclassified' | 'metadata_enriched'
  | 'retention_assigned' | 'retention_updated' | 'retention_expired'
  | 'disposal_scheduled' | 'disposal_executed' | 'disposal_cancelled'
  | 'legal_hold_placed' | 'legal_hold_released'
  | 'review_started' | 'review_completed'
  | 'archived' | 'restored'
  | 'escalated' | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported' | 'imported';

export interface RecordsEventOptions {
  tenantId: string;
  entityType: RecordsEntityType;
  entityId: string;
  action: RecordsAction;
  triggeredBy: string;
  previousState?: RecordsStatus;
  newState?: RecordsStatus;
  correlationId?: string;
  severity?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: RecordsAction): 'info' | 'warning' | 'critical' {
  if (act === 'legal_hold_placed' || act === 'disposal_executed') return 'critical';
  if (act === 'retention_expired' || act === 'disposal_scheduled' || act === 'reclassified' || act === 'legal_hold_released') return 'warning';
  return 'info';
}

export function emitRecordsEvent(opts: RecordsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `records.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'records',
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

export function emitRecordsStatusChange(
  tenantId: string, entityType: RecordsEntityType, entityId: string,
  previousState: RecordsStatus, newState: RecordsStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitRecordsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitLegalHoldPlaced(tenantId: string, recordId: string, reason: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'legal_hold', entityId: recordId, action: 'legal_hold_placed', triggeredBy, data: { reason } });
}

export function emitLegalHoldReleased(tenantId: string, recordId: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'legal_hold', entityId: recordId, action: 'legal_hold_released', triggeredBy });
}

export function emitDisposalExecuted(tenantId: string, recordId: string, method: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'disposal_action', entityId: recordId, action: 'disposal_executed', triggeredBy, data: { method } });
}

export function emitRetentionAssigned(tenantId: string, recordId: string, retentionDays: number, policyName: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'retention_schedule', entityId: recordId, action: 'retention_assigned', triggeredBy, data: { retentionDays, policyName } });
}

export function emitRecordClassified(tenantId: string, recordId: string, classification: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'record', entityId: recordId, action: 'classified', triggeredBy, data: { classification } });
}

export function emitRecordReclassified(tenantId: string, recordId: string, oldClass: string, newClass: string, triggeredBy: string): void {
  emitRecordsEvent({ tenantId, entityType: 'record', entityId: recordId, action: 'reclassified', triggeredBy, data: { oldClassification: oldClass, newClassification: newClass } });
}
