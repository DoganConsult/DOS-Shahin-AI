export declare function getDashboardStats(tenantId: string): Promise<Record<string, number>>;
export declare function getKpiMetrics(tenantId: string): Promise<{
    totalDashboards: number;
    activeDashboards: number;
    publishedDashboards: number;
    staleDashboards: number;
    totalWidgets: number;
    staleWidgets: number;
    avgRefreshMinutes: number;
    kpiCoverageRate: number;
    publishRate: number;
}>;
export declare function getWidgetTypeBreakdown(tenantId: string): Promise<Array<{
    widgetType: string;
    count: number;
    staleCount: number;
    failedCount: number;
}>>;
export declare function getDataSourceBreakdown(tenantId: string): Promise<Array<{
    dataSource: string;
    dashboardCount: number;
    widgetCount: number;
}>>;
export declare function getStaleWidgets(tenantId: string): Promise<Array<{
    id: string;
    title: string;
    widgetType: string;
    dashboardId: string;
    dataSource: string;
    lastRefreshedAt: string | null;
    hoursStale: number;
    refreshFailed: boolean;
}>>;
export declare function getAgingReport(tenantId: string): Promise<Array<{
    bucket: string;
    count: number;
}>>;
export declare function searchEntities(tenantId: string, params: {
    query?: string;
    status?: string;
    dashboardType?: string;
    dataSource?: string;
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
