export declare function transitionStatus(tenantId: string, entityId: string, targetStatus: string, userId: string, entityType?: 'organization' | 'department' | 'org_change', _reason?: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
export declare function bulkTransitionStatus(tenantId: string, entityIds: string[], targetStatus: string, userId: string, entityType?: 'organization' | 'department' | 'org_change'): Promise<{
    succeeded: string[];
    failed: Array<{
        id: string;
        error: string;
    }>;
}>;
export declare function getStatusHistory(tenantId: string, entityId: string): Promise<Array<{
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedAt: string;
}>>;
export declare function getLifecycleState(tenantId: string, entityId: string): Promise<{
    entityId: string;
    status: string;
    slaHours: number;
    remainingHours: number;
    breached: boolean;
} | null>;
export declare function getAvailableTransitions(currentState: string): Promise<string[]>;
export declare function getPendingChanges(tenantId: string): Promise<Array<{
    id: string;
    status: string;
    updatedAt: string;
}>>;
export declare function getSuspendedOrgs(tenantId: string): Promise<Array<{
    id: string;
    status: string;
    updatedAt: string;
}>>;
