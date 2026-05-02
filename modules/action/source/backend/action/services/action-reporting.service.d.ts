export interface ActionDashboard {
    totalItems: number;
    pendingItems: number;
    inProgressItems: number;
    completedItems: number;
    overdueItems: number;
    cancelledItems: number;
    completionRate: number;
    overdueRate: number;
}
export interface ActionsBySource {
    sourceType: string;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionRate: number;
}
export interface ActionsByAssignee {
    assignedTo: string;
    total: number;
    completed: number;
    overdue: number;
    inProgress: number;
    completionRate: number;
    averageResolutionDays: number | null;
}
export interface ResolutionTimeStat {
    sourceType: string | null;
    averageDays: number;
    medianDays: number | null;
    minDays: number;
    maxDays: number;
    count: number;
}
export interface AgingBucket {
    label: string;
    minDays: number;
    maxDays: number | null;
    count: number;
}
export interface SlaComplianceReport {
    totalWithDeadline: number;
    onTime: number;
    overdue: number;
    complianceRate: number;
    averageDaysToDeadline: number | null;
}
export declare function computeCompletionRate(completed: number, total: number): number;
export declare function buildAgingBuckets(items: {
    daysOpen: number;
}[]): AgingBucket[];
export declare function getActionDashboard(tenantId: string, filters?: {
    assignedTo?: string;
    sourceType?: string;
}): Promise<ActionDashboard>;
export declare function getActionsBySource(tenantId: string): Promise<ActionsBySource[]>;
export declare function getActionsByAssignee(tenantId: string): Promise<ActionsByAssignee[]>;
export declare function getResolutionTimeStats(tenantId: string): Promise<ResolutionTimeStat[]>;
export declare function getAgingAnalysis(tenantId: string, assignedTo?: string): Promise<AgingBucket[]>;
export declare function getSlaComplianceReport(tenantId: string, filters?: {
    assignedTo?: string;
    sourceType?: string;
}): Promise<SlaComplianceReport>;
