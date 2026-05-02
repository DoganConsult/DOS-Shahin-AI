import type { AnalyticsStatus } from '@dos/types/analytics';
export type AnalyticsEntityType = 'dashboard' | 'widget' | 'kpi' | 'report_snapshot' | 'data_source' | 'kpi_threshold';
export type AnalyticsAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'published' | 'deprecated' | 'archived' | 'shared' | 'cloned' | 'exported' | 'widget_added' | 'widget_removed' | 'widget_refreshed' | 'widget_refresh_failed' | 'widget_config_changed' | 'kpi_threshold_breached' | 'kpi_target_met' | 'kpi_recalculated' | 'report_generated' | 'report_scheduled' | 'report_exported' | 'data_source_connected' | 'data_source_disconnected' | 'data_source_refresh_failed' | 'access_granted' | 'access_revoked' | 'escalated';
export type AnalyticsEventSeverity = 'info' | 'warning' | 'critical';
export interface AnalyticsEventOptions {
    tenantId: string;
    entityType: AnalyticsEntityType;
    entityId: string;
    action: AnalyticsAction;
    triggeredBy: string;
    previousState?: AnalyticsStatus;
    newState?: AnalyticsStatus;
    correlationId?: string;
    data?: Record<string, unknown>;
}
export declare function emitAnalyticsEvent(opts: AnalyticsEventOptions): void;
export declare function emitAnalyticsStatusChange(tenantId: string, entityType: AnalyticsEntityType, entityId: string, previousState: AnalyticsStatus, newState: AnalyticsStatus, triggeredBy: string, correlationId?: string): void;
export declare function emitDashboardPublished(tenantId: string, dashboardId: string, triggeredBy: string, data?: {
    dashboardType?: string;
    widgetCount?: number;
    sharedWithTeamIds?: string[];
}): void;
export declare function emitDashboardShared(tenantId: string, dashboardId: string, triggeredBy: string, data: {
    sharedWithUserId?: string;
    sharedWithTeamId?: string;
    visibility?: string;
}): void;
export declare function emitDashboardCloned(tenantId: string, sourceDashboardId: string, newDashboardId: string, triggeredBy: string): void;
export declare function emitWidgetAdded(tenantId: string, dashboardId: string, widgetId: string, triggeredBy: string, data?: {
    widgetType?: string;
    dataSource?: string;
}): void;
export declare function emitWidgetRemoved(tenantId: string, dashboardId: string, widgetId: string, triggeredBy: string): void;
export declare function emitWidgetRefreshed(tenantId: string, widgetId: string, triggeredBy: string, data?: {
    durationMs?: number;
    rowCount?: number;
    dataSource?: string;
}): void;
export declare function emitWidgetRefreshFailed(tenantId: string, widgetId: string, triggeredBy: string, data: {
    errorMessage: string;
    dataSource?: string;
    consecutiveFailures?: number;
}): void;
export declare function emitKpiThresholdBreached(tenantId: string, kpiId: string, triggeredBy: string, data: {
    metricCode: string;
    currentValue: number;
    threshold: number;
    moduleCode?: string;
}): void;
export declare function emitKpiTargetMet(tenantId: string, kpiId: string, triggeredBy: string, data: {
    metricCode: string;
    currentValue: number;
    target: number;
    period?: string;
}): void;
export declare function emitKpiRecalculated(tenantId: string, kpiId: string, triggeredBy: string, data: {
    metricCode: string;
    previousValue?: number;
    newValue: number;
    period: string;
}): void;
export declare function emitReportGenerated(tenantId: string, reportId: string, triggeredBy: string, data?: {
    dashboardId?: string;
    format?: string;
    rowCount?: number;
    generationMs?: number;
}): void;
export declare function emitReportScheduled(tenantId: string, reportId: string, triggeredBy: string, data?: {
    dashboardId?: string;
    cronExpression?: string;
    format?: string;
    recipients?: string[];
}): void;
export declare function emitReportExported(tenantId: string, reportId: string, triggeredBy: string, data?: {
    format?: string;
    rowCount?: number;
    fileSizeBytes?: number;
}): void;
export declare function emitDataSourceConnected(tenantId: string, dataSourceId: string, triggeredBy: string, data?: {
    dataSourceType?: string;
    moduleCode?: string;
}): void;
export declare function emitDataSourceDisconnected(tenantId: string, dataSourceId: string, triggeredBy: string, data?: {
    dataSourceType?: string;
    reason?: string;
    affectedWidgets?: number;
}): void;
export declare function emitDataSourceRefreshFailed(tenantId: string, dataSourceId: string, triggeredBy: string, data: {
    dataSourceType?: string;
    errorMessage: string;
    affectedWidgets?: number;
}): void;
