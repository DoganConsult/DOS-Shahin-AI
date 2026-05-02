export declare function transitionStatus(tenantId: string, entityId: string, targetStatus: string, userId: string, entityType?: 'dashboard' | 'dataset' | 'metric', _reason?: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
export declare function bulkTransitionStatus(tenantId: string, entityIds: string[], targetStatus: string, userId: string, entityType?: 'dashboard' | 'dataset' | 'metric'): Promise<{
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
export declare function getLifecycleState(tenantId: string, entityId: string, entityType?: 'dashboard' | 'dataset' | 'metric'): Promise<{
    entityId: string;
    status: string;
    slaHours: number;
    remainingHours: number;
    breached: boolean;
} | null>;
export declare function getAvailableTransitions(_tenantId: string, currentState: string): Promise<string[]>;
