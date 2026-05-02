import { eventBus } from '../../ports/events.port';
import type { IncidentStatus } from '@dos/types/incident';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type IncidentEntityType = 'incident' | 'investigation' | 'lesson_learned' | 'timeline_entry';
export type IncidentAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'escalated'
  | 'detected' | 'triaged' | 'contained' | 'eradicated' | 'resolved' | 'closed' | 'reopened'
  | 'sla_breached' | 'sla_warning'
  | 'severity_changed' | 'priority_escalated'
  | 'investigation_started' | 'investigation_completed'
  | 'root_cause_identified' | 'lesson_learned_recorded'
  | 'notification_sent' | 'regulatory_notified'
  | 'evidence_attached' | 'timeline_updated'
  | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface IncidentEventOptions {
  tenantId: string;
  entityType: IncidentEntityType;
  entityId: string;
  action: IncidentAction;
  triggeredBy: string;
  previousState?: IncidentStatus;
  newState?: IncidentStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: IncidentAction): 'info' | 'warning' | 'critical' {
  if (act === 'detected' || act === 'sla_breached' || act === 'priority_escalated') return 'critical';
  if (act === 'escalated' || act === 'sla_warning' || act === 'severity_changed' || act === 'reopened') return 'warning';
  return 'info';
}

export function emitIncidentEvent(opts: IncidentEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `incident.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'incident',
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

export function emitIncidentStatusChange(
  tenantId: string, entityType: IncidentEntityType, entityId: string,
  previousState: IncidentStatus, newState: IncidentStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitIncidentEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitIncidentDetected(tenantId: string, incidentId: string, severity: string, incidentType: string, triggeredBy: string): void {
  emitIncidentEvent({ tenantId, entityType: 'incident', entityId: incidentId, action: 'detected', triggeredBy, data: { severity, incidentType } });
}

export function emitSlaBreach(tenantId: string, incidentId: string, severity: string, slaHours: number, hoursOpen: number, triggeredBy: string): void {
  emitIncidentEvent({ tenantId, entityType: 'incident', entityId: incidentId, action: 'sla_breached', triggeredBy, data: { severity, slaHours, hoursOpen } });
}

export function emitSeverityChanged(tenantId: string, incidentId: string, oldSeverity: string, newSeverity: string, triggeredBy: string): void {
  emitIncidentEvent({ tenantId, entityType: 'incident', entityId: incidentId, action: 'severity_changed', triggeredBy, data: { oldSeverity, newSeverity } });
}

export function emitRootCauseIdentified(tenantId: string, incidentId: string, rootCause: string, triggeredBy: string): void {
  emitIncidentEvent({ tenantId, entityType: 'investigation', entityId: incidentId, action: 'root_cause_identified', triggeredBy, data: { rootCause } });
}

export function emitRegulatoryNotified(tenantId: string, incidentId: string, regulatoryBody: string, triggeredBy: string): void {
  emitIncidentEvent({ tenantId, entityType: 'incident', entityId: incidentId, action: 'regulatory_notified', triggeredBy, data: { regulatoryBody } });
}
