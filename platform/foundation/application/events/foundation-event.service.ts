import { eventBus } from '../../ports/events.port';
import { randomUUID } from 'crypto';

export type FoundationEntityType = 'organization' | 'department' | 'position' | 'org_change' | 'hierarchy';
export type FoundationAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'org_restructured' | 'department_created' | 'department_archived'
  | 'position_assigned' | 'position_vacated' | 'hierarchy_changed'
  | 'org_change_approved' | 'org_change_rejected'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface FoundationEventOptions {
  tenantId: string;
  entityType: FoundationEntityType;
  entityId: string;
  action: FoundationAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: FoundationAction): 'info' | 'warning' | 'critical' {
  if (act === 'org_restructured' || act === 'deleted') return 'critical';
  if (act === 'hierarchy_changed' || act === 'escalated') return 'warning';
  return 'info';
}

export function emitFoundationEvent(opts: FoundationEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `foundation.${opts.entityType}.${opts.action}` as string;
    eventBus.publish({
      eventType,
      tenantId: opts.tenantId,
      source: 'foundation',
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
    });
  } catch {
  }
}

export function emitFoundationStatusChange(
  tenantId: string, entityType: FoundationEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitFoundationEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitOrgRestructured(tenantId: string, orgId: string, changeType: string, triggeredBy: string): void {
  emitFoundationEvent({ tenantId, entityType: 'organization', entityId: orgId, action: 'org_restructured', triggeredBy, data: { changeType } });
}

export function emitDepartmentCreated(tenantId: string, deptId: string, parentId: string, triggeredBy: string): void {
  emitFoundationEvent({ tenantId, entityType: 'department', entityId: deptId, action: 'department_created', triggeredBy, data: { parentId } });
}

export function emitPositionAssigned(tenantId: string, positionId: string, userId: string, triggeredBy: string): void {
  emitFoundationEvent({ tenantId, entityType: 'position', entityId: positionId, action: 'position_assigned', triggeredBy, data: { userId } });
}
