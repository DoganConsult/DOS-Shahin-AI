export interface AssignmentHistoryEntry {
    assignmentId: string;
    actionId: string;
    previousAssignee: string | null;
    newAssignee: string;
    assignedBy: string;
    reason: string | null;
    assignedAt: string;
}
export interface AssigneeWorkloadEntry {
    assigneeId: string;
    openCount: number;
    inProgressCount: number;
    overdueCount: number;
    totalActive: number;
}
/** Assign an action item to a user. */
export declare function assignAction(tenantId: string, actionId: string, assigneeId: string, assignedBy: string): Promise<{
    actionId: string;
    assigneeId: string;
}>;
/** Reassign an action item to a different user. Validates not same user. */
export declare function reassignAction(tenantId: string, actionId: string, newAssigneeId: string, reassignedBy: string, reason: string): Promise<{
    actionId: string;
    newAssigneeId: string;
    previousAssigneeId: string | null;
}>;
/** Get full assignment history for an action item. */
export declare function getAssignmentHistory(tenantId: string, actionId: string): Promise<AssignmentHistoryEntry[]>;
/** Get workload counts per assignee across all active action items. */
export declare function getAssigneeWorkload(tenantId: string): Promise<AssigneeWorkloadEntry[]>;
