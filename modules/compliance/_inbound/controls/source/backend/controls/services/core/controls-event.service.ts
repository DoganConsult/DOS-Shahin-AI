import { eventBus } from '../../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ControlsEntityType = 'control' | 'test' | 'deficiency' | 'evidence_link' | 'mapping';
export type ControlsAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'test_scheduled' | 'test_completed' | 'test_failed'
  | 'effectiveness_assessed' | 'effectiveness_failed'
  | 'deficiency_detected' | 'deficiency_resolved'
  | 'mapping_created' | 'mapping_removed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface ControlsEventOptions {
  tenantId: string;
  entityType: ControlsEntityType;
  entityId: string;
  action: ControlsAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ControlsAction): 'info' | 'warning' | 'critical' {
  if (act === 'effectiveness_failed' || act === 'deficiency_detected') return 'critical';
  if (act === 'test_failed' || act === 'escalated') return 'warning';
  return 'info';
}

export function emitControlsEvent(opts: ControlsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `controls.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'controls',
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

export function emitControlsStatusChange(
  tenantId: string, entityType: ControlsEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitControlsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitTestCompleted(tenantId: string, testId: string, controlId: string, result: string, triggeredBy: string): void {
  emitControlsEvent({ tenantId, entityType: 'test', entityId: testId, action: 'test_completed', triggeredBy, data: { controlId, result } });
}

export function emitDeficiencyDetected(tenantId: string, defId: string, controlId: string, severity: string, triggeredBy: string): void {
  emitControlsEvent({ tenantId, entityType: 'deficiency', entityId: defId, action: 'deficiency_detected', triggeredBy, data: { controlId, severity } });
}

export function emitEffectivenessAssessed(tenantId: string, controlId: string, score: number, triggeredBy: string): void {
  emitControlsEvent({ tenantId, entityType: 'control', entityId: controlId, action: 'effectiveness_assessed', triggeredBy, data: { score } });
}
