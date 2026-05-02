export declare function getDashboardStats(tenantId: string): Promise<Record<string, number>>;
export declare function getKpiMetrics(tenantId: string): Promise<{
    total: number;
    active: number;
    overdue: number;
    completionRate: number;
    avgCompletionDays: number;
    onTimeRate: number;
}>;
export declare function getSourceBreakdown(tenantId: string): Promise<Array<{
    sourceType: string;
    count: number;
    overdueCount: number;
    completedCount: number;
}>>;
export declare function getPriorityBreakdown(tenantId: string): Promise<Array<{
    priority: string;
    count: number;
    overdueCount: number;
}>>;
export declare function getAssigneeWorkload(tenantId: string): Promise<Array<{
    assignedTo: string;
    totalActions: number;
    openActions: number;
    overdueActions: number;
}>>;
export declare function getAgingReport(tenantId: string): Promise<Array<{
    bucket: string;
    count: number;
}>>;
export declare function searchEntities(tenantId: string, params: {
    query?: string;
    status?: string;
    priority?: string;
    sourceType?: string;
    assignedTo?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}): Promise<{
    rows: unknown[];
    total: number;
}>;
export declare function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]>;
export declare function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]>;
