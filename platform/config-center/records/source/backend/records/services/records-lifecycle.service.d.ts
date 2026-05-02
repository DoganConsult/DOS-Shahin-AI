import type { RecordsStatus } from '../types/records.types';
export interface LifecycleTransitionResult {
    recordId: string;
    previousStatus: RecordsStatus;
    newStatus: RecordsStatus;
    transitionedAt: string;
    transitionedBy: string;
    workflowInstanceId: string | null;
    requiresApproval: boolean;
}
export interface LifecycleHistoryEntry {
    historyId: string;
    recordId: string;
    previousStatus: RecordsStatus | null;
    newStatus: RecordsStatus;
    action: string;
    transitionedBy: string;
    reason: string | null;
    workflowInstanceId: string | null;
    transitionedAt: string;
}
export declare function transitionStatus(tenantId: string, recordId: string, action: string, actorId: string, reason?: string, workflowInstanceId?: string): Promise<LifecycleTransitionResult>;
export declare function getLifecycleHistory(tenantId: string, recordId: string, limit?: number, offset?: number): Promise<{
    rows: LifecycleHistoryEntry[];
    total: number;
}>;
export declare function getAllowedTransitions(currentStatus: RecordsStatus): string[];
export declare function doesTransitionRequireApproval(action: string): boolean;
export declare function doesTransitionRequireWorkflow(action: string): boolean;
