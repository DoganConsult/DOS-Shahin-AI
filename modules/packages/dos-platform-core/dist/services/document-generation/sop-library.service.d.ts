interface SopFilters {
    processType?: string;
    stageId?: string;
    roleId?: string;
}
interface SopCompletionFilters {
    sopId?: string;
    userId?: string;
    status?: string;
    limit?: number;
}
export declare function getSOPs(tenantId: string, filters?: SopFilters): Promise<Record<string, unknown>[]>;
export declare function upsertSOP(tenantId: string, sop: Record<string, any>): Promise<Record<string, unknown>>;
export declare function deleteSOP(tenantId: string, sopId: string): Promise<void>;
export declare function seedDefaultSOPs(tenantId: string): Promise<number>;
export declare function startSOPCompletion(tenantId: string, sopId: string, userId: string, totalSteps: number): Promise<Record<string, unknown>>;
export declare function updateSOPProgress(tenantId: string, completionId: string, completedSteps: unknown[], notes?: string): Promise<Record<string, unknown> | null>;
export declare function getSOPCompletions(tenantId: string, filters?: SopCompletionFilters): Promise<Record<string, unknown>[]>;
export declare function getSOPComplianceStats(tenantId: string): Promise<Record<string, unknown>>;
export {};
