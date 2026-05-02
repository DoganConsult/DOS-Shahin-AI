export declare function getDashboardStats(tenantId: string): Promise<Record<string, number>>;
export declare function getKpiMetrics(tenantId: string): Promise<{
    total: number;
    active: number;
    unclassified: number;
    criticalCount: number;
    unowned: number;
    overdueReview: number;
    classificationRate: number;
}>;
export declare function getTypeBreakdown(tenantId: string): Promise<Array<{
    assetType: string;
    count: number;
    activeCount: number;
    criticalCount: number;
}>>;
export declare function getClassificationBreakdown(tenantId: string): Promise<Array<{
    classification: string;
    count: number;
}>>;
export declare function getUnclassifiedAssets(tenantId: string): Promise<Array<{
    id: string;
    title: string;
    assetType: string;
    status: string;
    daysSinceCreation: number;
}>>;
export declare function getAgingReport(tenantId: string): Promise<Array<{
    bucket: string;
    count: number;
}>>;
export declare function searchEntities(tenantId: string, params: {
    query?: string;
    status?: string;
    assetType?: string;
    classification?: string;
    criticality?: string;
    environment?: string;
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
