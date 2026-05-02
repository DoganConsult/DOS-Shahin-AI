export type FoundationEntityType = 'organization' | 'department' | 'position' | 'org_change' | 'hierarchy';
export type FoundationAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'org_restructured' | 'department_created' | 'department_archived' | 'position_assigned' | 'position_vacated' | 'hierarchy_changed' | 'org_change_approved' | 'org_change_rejected' | 'approved' | 'rejected' | 'escalated' | 'exported';
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
export declare function emitFoundationEvent(opts: FoundationEventOptions): void;
export declare function emitFoundationStatusChange(tenantId: string, entityType: FoundationEntityType, entityId: string, previousState: string, newState: string, triggeredBy: string, correlationId?: string): void;
export declare function emitOrgRestructured(tenantId: string, orgId: string, changeType: string, triggeredBy: string): void;
export declare function emitDepartmentCreated(tenantId: string, deptId: string, parentId: string, triggeredBy: string): void;
export declare function emitPositionAssigned(tenantId: string, positionId: string, userId: string, triggeredBy: string): void;
