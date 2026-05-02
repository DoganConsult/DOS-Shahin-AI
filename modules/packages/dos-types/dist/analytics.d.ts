/**
 * @dos/types — analytics, reporting, and metrics types
 * Covers KPIs, dashboards, reports, maturity
 */
export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'not_measured';
export type KpiDirection = 'higher_is_better' | 'lower_is_better' | 'target_range';
export type KpiAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentage' | 'ratio';
export interface KpiDefinition {
    kpiCode: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: string;
    unit?: string;
    direction: KpiDirection;
    aggregation: KpiAggregation;
    targetValue?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    measurementQuery?: string;
    refreshInterval?: number;
    moduleCode?: string;
    frameworkCode?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface KpiValue {
    kpiCode: string;
    tenantId: string;
    workspaceId?: string;
    value: number;
    previousValue?: number;
    change?: number;
    changePercent?: number;
    status: KpiStatus;
    measuredAt: string;
    period?: string;
    breakdown?: Record<string, number>;
    metadata?: Record<string, unknown>;
}
export interface KpiTrend {
    kpiCode: string;
    tenantId: string;
    period: string;
    datapoints: Array<{
        timestamp: string;
        value: number;
        status: KpiStatus;
    }>;
    trend: 'improving' | 'stable' | 'declining' | 'volatile';
    forecastNext?: number;
}
export type WidgetType = 'kpi_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'donut_chart' | 'heat_map' | 'scatter_plot' | 'radar_chart' | 'sankey_diagram' | 'table' | 'list' | 'gauge' | 'text' | 'iframe' | 'custom';
export interface DashboardLayout {
    layoutId: string;
    tenantId: string;
    userId?: string;
    name: string;
    nameAr?: string;
    isDefault: boolean;
    isShared: boolean;
    widgets: DashboardWidget[];
    createdAt: string;
    updatedAt: string;
}
export interface DashboardWidget {
    widgetId: string;
    type: WidgetType;
    title: string;
    titleAr?: string;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    config: WidgetConfig;
    refreshInterval?: number;
    isVisible?: boolean;
}
export interface WidgetConfig {
    dataSource?: string;
    query?: string;
    filters?: Record<string, unknown>;
    groupBy?: string;
    aggregation?: KpiAggregation;
    limit?: number;
    timeRange?: {
        preset?: '7d' | '30d' | '90d' | '1y' | 'custom';
        from?: string;
        to?: string;
    };
    colors?: string[];
    showLegend?: boolean;
    showTooltip?: boolean;
    formatType?: 'number' | 'percentage' | 'currency' | 'date';
    currency?: string;
    decimals?: number;
    kpiCode?: string;
    entityType?: string;
    moduleCode?: string;
    targetValue?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    [key: string]: unknown;
}
export interface WidgetData {
    widgetId: string;
    type: WidgetType;
    data: unknown;
    lastUpdatedAt: string;
    executionMs?: number;
    error?: string;
}
export type ReportStatus = 'draft' | 'scheduled' | 'generating' | 'ready' | 'failed' | 'archived';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json' | 'html';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
export interface ReportDefinition {
    reportId: string;
    tenantId: string;
    name: string;
    nameAr?: string;
    description?: string;
    category: string;
    format: ReportFormat;
    template?: string;
    sections: ReportSection[];
    schedule?: ReportSchedule;
    recipients?: ReportRecipient[];
    parameters?: Record<string, unknown>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface ReportSection {
    sectionId: string;
    title: string;
    titleAr?: string;
    type: 'chart' | 'table' | 'text' | 'kpi_summary' | 'findings_list';
    config: Record<string, unknown>;
    order: number;
}
export interface ReportSchedule {
    frequency: ReportPeriod;
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour?: number;
    minute?: number;
    timezone?: string;
    nextRunAt?: string;
    lastRunAt?: string;
}
export interface ReportRecipient {
    userId?: string;
    email?: string;
    role?: string;
    includeInEmail: boolean;
}
export interface ReportRun {
    runId: string;
    reportId: string;
    tenantId: string;
    status: ReportStatus;
    format: ReportFormat;
    period?: string;
    fromDate?: string;
    toDate?: string;
    parameters?: Record<string, unknown>;
    fileUrl?: string;
    fileSize?: number;
    rowCount?: number;
    startedAt: string;
    completedAt?: string;
    generatedBy?: string;
    error?: string;
}
export type MaturityLevel = 1 | 2 | 3 | 4 | 5;
export type MaturityModel = 'cmmi' | 'nist_csf' | 'bespoke' | 'iso' | 'custom';
export interface MaturityDimension {
    dimensionId: string;
    name: string;
    nameAr?: string;
    weight: number;
    description?: string;
    criteria: MaturityCriterion[];
}
export interface MaturityCriterion {
    criterionId: string;
    level: MaturityLevel;
    description: string;
    descriptionAr?: string;
    evidenceRequired: string[];
}
export interface MaturityAssessment {
    assessmentId: string;
    tenantId: string;
    model: MaturityModel;
    overallLevel: MaturityLevel;
    overallScore: number;
    dimensions: MaturityDimensionScore[];
    gaps: MaturityGap[];
    recommendations: MaturityRecommendation[];
    assessedAt: string;
    assessedBy?: string;
    validUntil?: string;
    metadata?: Record<string, unknown>;
}
export interface MaturityDimensionScore {
    dimensionId: string;
    name: string;
    level: MaturityLevel;
    score: number;
    maxScore: number;
    gaps?: MaturityGap[];
}
export interface MaturityGap {
    gapId: string;
    dimensionId?: string;
    currentLevel: MaturityLevel;
    targetLevel: MaturityLevel;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
}
export interface MaturityRecommendation {
    recommendationId: string;
    dimensionId?: string;
    title: string;
    titleAr?: string;
    description: string;
    expectedImpact: number;
    timeframeMonths: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    actions: string[];
}
export interface IndustryBenchmark {
    benchmarkId: string;
    industry: string;
    region?: string;
    metric: string;
    period: string;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    sampleSize?: number;
    source?: string;
    createdAt: string;
}
export interface TenantBenchmarkComparison {
    tenantId: string;
    metric: string;
    tenantValue: number;
    benchmarkP25: number;
    benchmarkP50: number;
    benchmarkP75: number;
    percentileRank: number;
    rating: 'below_average' | 'average' | 'above_average' | 'top_performer';
    industry?: string;
    period: string;
}
export type AnalyticsPeriod = '7d' | '30d' | '90d' | '6m' | '1y' | 'all_time' | 'custom';
export interface AnalyticsUsageSummary {
    tenantId: string;
    period: AnalyticsPeriod;
    activeUsers: number;
    totalUsers: number;
    sessionCount: number;
    avgSessionDurationMinutes: number;
    topModules: Array<{
        moduleCode: string;
        usageCount: number;
    }>;
    topFeatures: Array<{
        feature: string;
        usageCount: number;
    }>;
    generatedAt: string;
}
export interface AnalyticsEvent {
    eventId?: string;
    tenantId: string;
    userId?: string;
    sessionId?: string;
    eventType: string;
    category: string;
    moduleCode?: string;
    entityType?: string;
    entityId?: string;
    properties?: Record<string, unknown>;
    timestamp: string;
    clientIp?: string;
    userAgent?: string;
}
export interface KpiSnapshot {
    snapshot_id: string;
    tenant_id: string;
    metric_code: string;
    module_code: string;
    value: number;
    period: string;
    computed_at: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface KpiSnapshotCreateInput {
    tenant_id: string;
    metric_code: string;
    module_code: string;
    value: number;
    period: string;
    computed_at: string;
    created_by: string;
}
export interface KpiSnapshotUpdateInput {
    metric_code: string;
    module_code: string;
    value: number;
    period: string;
    computed_at: string;
    updated_by: string;
}
export interface KpiSnapshotListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface KpiSnapshotListResult {
    rows: KpiSnapshot[];
    total: number;
}
export type AnalyticsStatus = 'draft' | 'active' | 'published' | 'deprecated' | 'archived';
export declare const ANALYTICS_STATUSES: readonly AnalyticsStatus[];
export type AnalyticsSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const ANALYTICS_SOURCES: readonly AnalyticsSource[];
export type AnalyticsStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface AnalyticsEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'analytics';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: AnalyticsStatus;
    newState?: AnalyticsStatus;
    data: Record<string, unknown>;
}
