interface CreateDependencyInput {
    source_type: string;
    source_id: string;
    target_type: string;
    target_id: string;
    dependency_type?: string;
    criticality?: string;
    direction?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}
export declare function listDependencies(tenantId: string, params?: {
    source_type?: string;
    source_id?: string;
    target_type?: string;
    target_id?: string;
    dependency_type?: string;
    page?: number;
    pageSize?: number;
}): Promise<{
    data: any[];
    page: number;
    pageSize: number;
    total: any;
    totalPages: number;
}>;
export declare function createDependency(tenantId: string, userId: string, input: CreateDependencyInput): Promise<any>;
export declare function deleteDependency(tenantId: string, userId: string, id: string): Promise<any>;
export declare function getUpstreamChain(tenantId: string, entityType: string, entityId: string, maxDepth?: number): Promise<any[]>;
export declare function getDownstreamChain(tenantId: string, entityType: string, entityId: string, maxDepth?: number): Promise<any[]>;
export declare function detectCycles(tenantId: string): Promise<any[]>;
export declare function getBlastRadius(tenantId: string, entityType: string, entityId: string): Promise<{
    entityType: string;
    entityId: string;
    impactedCount: number;
    impactedEntities: {
        type: string;
        id: string;
    }[];
    maxDepth: number;
}>;
export declare function getDependencyStats(tenantId: string): Promise<any>;
export {};
