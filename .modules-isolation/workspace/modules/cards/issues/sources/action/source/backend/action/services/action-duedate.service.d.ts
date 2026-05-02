export interface UpcomingDeadlineEntry {
    actionId: string;
    title: string;
    deadline: string;
    assignedTo: string | null;
    status: string;
    criticality: string;
    hoursRemaining: number;
}
export interface OverdueEntry {
    actionId: string;
    title: string;
    deadline: string;
    assignedTo: string | null;
    status: string;
    criticality: string;
    daysOverdue: number;
}
/** Set or update the deadline for an action item. */
export declare function setDueDate(tenantId: string, actionId: string, deadline: string, updatedBy: string): Promise<{
    actionId: string;
    deadline: string;
}>;
/** Extend the deadline for an action item. New date must be after current deadline. */
export declare function extendDueDate(tenantId: string, actionId: string, newDeadline: string, extendedBy: string, reason: string): Promise<{
    actionId: string;
    previousDeadline: string | null;
    newDeadline: string;
}>;
/** Find all action items that are past their deadline and not yet in a terminal state. */
export declare function checkOverdue(tenantId: string): Promise<OverdueEntry[]>;
/** Get action items with deadlines within the specified number of days. */
export declare function getUpcomingDeadlines(tenantId: string, withinDays: number): Promise<UpcomingDeadlineEntry[]>;
