/** Transition an action item to a new status with validation and audit. */
export declare function transitionStatus(tenantId: string, actionId: string, targetStatus: string, userId: string, reason?: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Transition multiple action items at once. */
export declare function bulkTransitionStatus(tenantId: string, actionIds: string[], targetStatus: string, userId: string): Promise<{
    succeeded: string[];
    failed: Array<{
        id: string;
        error: string;
    }>;
}>;
/** Get status transition history for an action item. */
export declare function getStatusHistory(tenantId: string, actionId: string): Promise<Array<{
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    reason: string | null;
    changedAt: string;
}>>;
/** Cancel an action item. */
export declare function cancelItem(tenantId: string, actionId: string, userId: string, reason?: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Reopen a completed or cancelled action item. */
export declare function reopenItem(tenantId: string, actionId: string, userId: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Submit an action item for completion review. */
export declare function submitCompletion(tenantId: string, actionId: string, userId: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Verify a completed action item. Requires DAuth lifecycle evaluation. */
export declare function verifyAction(tenantId: string, actionId: string, verifiedBy: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Close a verified action item. */
export declare function closeAction(tenantId: string, actionId: string, userId: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Mark an action item as overdue. */
export declare function markOverdue(tenantId: string, actionId: string, systemUserId: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
/** Escalate an overdue action item. */
export declare function escalateAction(tenantId: string, actionId: string, escalatedBy: string, reason?: string): Promise<{
    fromStatus: string;
    toStatus: string;
}>;
