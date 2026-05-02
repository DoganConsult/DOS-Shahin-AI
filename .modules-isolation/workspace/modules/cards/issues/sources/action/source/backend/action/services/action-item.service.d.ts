export interface ActionItemRecord {
    actionId: string;
    tenantId: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    source: string;
    sourceId: string;
    assignedToId: string | null;
    ownerId: string | null;
    dueDate: string | null;
    completedAt: string | null;
    verifiedById: string | null;
    verifiedAt: string | null;
    progressPercent: number;
    isOverdue: boolean;
    linkedModuleCode: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ActionItemFilters {
    status?: string;
    assignedTo?: string;
    sourceType?: string;
    limit?: number;
    offset?: number;
}
/** List action items with optional filters, ordered by criticality + deadline. */
export declare function getActionItems(tenantId: string, filters?: ActionItemFilters): Promise<{
    items: ActionItemRecord[];
    total: number;
}>;
/** Create a new action item. */
export declare function createActionItem(tenantId: string, input: {
    title: string;
    description?: string;
    sourceType?: string;
    sourceId?: string;
    assignedTo?: string;
    targetDate?: string;
    deadline?: string;
    criticality?: string;
    createdBy: string;
    verificationRequired?: boolean;
    verificationMethod?: string;
    ownerTeamId?: string;
}): Promise<ActionItemRecord>;
/** Update an existing action item. */
export declare function updateActionItem(tenantId: string, actionId: string, updates: {
    title?: string;
    description?: string;
    assignedTo?: string;
    targetDate?: string;
    deadline?: string;
    criticality?: string;
    progressPercentage?: number;
    verificationRequired?: boolean;
    verificationMethod?: string;
    ownerTeamId?: string;
    updatedBy: string;
}): Promise<ActionItemRecord>;
/** Daily digest: overdue, due-soon, and recently completed items for a user. */
export declare function getDailyDigest(tenantId: string, userId: string): Promise<{
    overdue: ActionItemRecord[];
    dueSoon: ActionItemRecord[];
    recentlyCompleted: ActionItemRecord[];
}>;
/** Consolidated action center: all active items sorted by criticality. */
export declare function getConsolidatedActionCenter(tenantId: string, userId?: string): Promise<ActionItemRecord[]>;
/** Create an action item from a cross-module event. */
export declare function createActionFromEvent(tenantId: string, source: {
    sourceType: string;
    sourceId: string;
    triggeredBy: string;
}, details: {
    title: string;
    description?: string;
    assignedTo?: string;
    deadline?: string;
    criticality?: string;
}): Promise<ActionItemRecord>;
