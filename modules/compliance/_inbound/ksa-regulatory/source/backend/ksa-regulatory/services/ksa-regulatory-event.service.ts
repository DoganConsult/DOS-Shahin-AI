import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type KsaRegulatoryEntityType = 'obligation' | 'readiness_snapshot' | 'gap' | 'mapping' | 'assessment';
export type KsaRegulatoryAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'obligation_mapped' | 'obligation_unmapped' | 'readiness_assessed'
  | 'gap_identified' | 'gap_resolved' | 'assessment_completed'
  | 'snapshot_created' | 'compliance_changed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface KsaRegulatoryEventOptions {
  tenantId: string;
  entityType: KsaRegulatoryEntityType;
  entityId: string;
  action: KsaRegulatoryAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: KsaRegulatoryAction): 'info' | 'warning' | 'critical' {
  if (act === 'gap_identified' || act === 'deleted') return 'critical';
  if (act === 'compliance_changed' || act === 'escalated') return 'warning';
  return 'info';
}

export function emitKsaRegulatoryEvent(opts: KsaRegulatoryEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `ksa_regulatory.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'ksa-regulatory',
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

export function emitKsaRegulatoryStatusChange(
  tenantId: string, entityType: KsaRegulatoryEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitKsaRegulatoryEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitObligationMapped(tenantId: string, obligationId: string, frameworkId: string, triggeredBy: string): void {
  emitKsaRegulatoryEvent({ tenantId, entityType: 'obligation', entityId: obligationId, action: 'obligation_mapped', triggeredBy, data: { frameworkId } });
}

export function emitGapIdentified(tenantId: string, gapId: string, severity: string, triggeredBy: string): void {
  emitKsaRegulatoryEvent({ tenantId, entityType: 'gap', entityId: gapId, action: 'gap_identified', triggeredBy, data: { severity } });
}

export function emitReadinessAssessed(tenantId: string, snapshotId: string, score: number, triggeredBy: string): void {
  emitKsaRegulatoryEvent({ tenantId, entityType: 'readiness_snapshot', entityId: snapshotId, action: 'readiness_assessed', triggeredBy, data: { score } });
}
