export interface SodConflictRecord {
    conflictId: string;
    userId: string;
    ruleCode: string;
    roleCodeA: string;
    roleCodeB: string;
    conflictLevel: string;
    detectedAt: string;
    resolvedAt: string | null;
    resolution: string | null;
}
export declare function detectConflictsForUser(tenantId: string, userId: string): Promise<SodConflictRecord[]>;
export declare function getUnresolvedConflicts(tenantId: string): Promise<SodConflictRecord[]>;
export declare function resolveConflict(tenantId: string, conflictId: string, resolution: string, resolvedBy: string): Promise<void>;
export declare function runTenantWideSodAudit(tenantId: string): Promise<number>;
