export interface AnalyticsDashboardContract {
    dashboardId: string;
    tenantId: string;
    nameEn: string;
    nameAr: string | null;
    descriptionEn: string | null;
    layout: 'grid' | 'freeform' | 'tabbed';
    status: 'draft' | 'published' | 'archived';
    visibility: 'private' | 'team' | 'department' | 'org';
    ownerId: string;
    widgetCount: number;
    lastViewedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface AnalyticsDatasetContract {
    datasetId: string;
    tenantId: string;
    nameEn: string;
    nameAr: string | null;
    sourceModule: string;
    sourceTable: string | null;
    queryDefinition: Record<string, unknown>;
    refreshPolicy: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
    lastRefreshedAt: string | null;
    rowCount: number | null;
    status: 'active' | 'stale' | 'error' | 'disabled';
    createdAt: string;
    updatedAt: string;
}
export interface AnalyticsMetricContract {
    metricId: string;
    tenantId: string;
    code: string;
    nameEn: string;
    nameAr: string | null;
    metricType: 'count' | 'sum' | 'average' | 'percentage' | 'ratio' | 'trend' | 'custom';
    datasetId: string | null;
    formula: string | null;
    currentValue: number | null;
    previousValue: number | null;
    trendDirection: 'up' | 'down' | 'flat' | null;
    unit: string | null;
    thresholds: {
        warning?: number;
        critical?: number;
    } | null;
    createdAt: string;
    updatedAt: string;
}
export interface AnalyticsWidgetContract {
    widgetId: string;
    dashboardId: string;
    widgetType: 'chart' | 'table' | 'kpi_card' | 'heatmap' | 'gauge' | 'text' | 'custom';
    titleEn: string;
    titleAr: string | null;
    metricIds: string[];
    datasetId: string | null;
    config: Record<string, unknown>;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    createdAt: string;
    updatedAt: string;
}
export interface AnalyticsSnapshotContract {
    snapshotId: string;
    tenantId: string;
    dashboardId: string;
    capturedBy: string;
    capturedAt: string;
    data: Record<string, unknown>;
    expiresAt: string | null;
}
export interface AnalyticsDiagnosticsContract {
    tenantId: string;
    totalDashboards: number;
    publishedDashboards: number;
    totalDatasets: number;
    staleDatasets: number;
    errorDatasets: number;
    totalMetrics: number;
    metricsWithThresholdBreach: number;
    refreshScheduleHealth: 'healthy' | 'degraded' | 'critical';
    capturedAt: string;
}
export interface AnalyticsListParams {
    tenantId: string;
    page?: number;
    limit?: number;
    status?: string;
    dashboardId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AnalyticsListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
}
