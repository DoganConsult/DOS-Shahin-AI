
import { publish } from '../ports/events.port';
import type { ModuleEventPayload } from '@dos/types';

function buildPayload(
  tenantId: string,
  entityId: string,
  eventType: string,
  triggeredBy: string,
  data: Record<string, unknown> = {},
  previousState?: string,
  newState?: string,
): ModuleEventPayload {
  return {
    tenantId,
    entityType: 'controls',
    entityId,
    moduleCode: 'controls',
    triggeredBy,
    timestamp: new Date().toISOString(),
    correlationId: `controls-${entityId}-${Date.now()}`,
    eventVersion: 1,
    previousState,
    newState,
    data,
  };
}

export function emitControlsCreated(tenantId: string, entityId: string, triggeredBy: string, data?: Record<string, unknown>): void {
  publish(('controls.created' as any), tenantId, buildPayload(tenantId, entityId, 'controls.created', triggeredBy, data, undefined, 'draft'));
}

export function emitControlsStatusChanged(tenantId: string, entityId: string, fromStatus: string, toStatus: string, triggeredBy: string): void {
  publish(('controls.status_changed' as any), tenantId, buildPayload(tenantId, entityId, 'controls.status_changed', triggeredBy, {}, fromStatus, toStatus));
}

export function emitControlsAssigned(tenantId: string, entityId: string, assignee: string, triggeredBy: string): void {
  publish(('controls.assigned' as any), tenantId, buildPayload(tenantId, entityId, 'controls.assigned', triggeredBy, { assignee }));
}

export function emitControlsEscalated(tenantId: string, entityId: string, reason: string, triggeredBy: string): void {
  publish(('controls.escalated' as any), tenantId, buildPayload(tenantId, entityId, 'controls.escalated', triggeredBy, { reason }));
}

export function emitControlsOverdue(tenantId: string, entityId: string, daysOverdue: number, triggeredBy: string): void {
  publish(('controls.overdue' as any), tenantId, buildPayload(tenantId, entityId, 'controls.overdue', triggeredBy, { daysOverdue }));
}

export function emitControlsClosed(tenantId: string, entityId: string, triggeredBy: string): void {
  publish(('controls.closed' as any), tenantId, buildPayload(tenantId, entityId, 'controls.closed', triggeredBy, {}, undefined, 'closed'));
}
