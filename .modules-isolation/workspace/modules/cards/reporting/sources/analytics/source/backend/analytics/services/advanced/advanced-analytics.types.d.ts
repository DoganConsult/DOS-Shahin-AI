export interface AnalyticsContext {
    tenantId: string;
    roleCode: string;
    moduleCode?: string;
    scenario?: string;
    orgStatus?: 'trial' | 'active' | 'suspended' | 'archived';
    filters?: Record<string, unknown>;
}
export interface DrillThroughPath {
    level: number;
    widgetId: string;
    title: string;
    titleAr?: string;
    payload: Record<string, unknown>;
    route?: string;
    children?: DrillThroughPath[];
}
export interface AdvancedAnalyticsResult {
    widgetId: string;
    data: Record<string, unknown>;
    drillThrough?: DrillThroughPath[];
    predictiveInsights?: PredictiveInsight[];
    realTimeMetrics?: RealTimeMetric[];
    metadata: {
        generatedAt: string;
        dataSource: 'database' | 'worker' | 'orchestrator' | 'computed';
        queryTimeMs: number;
        recordCount: number;
    };
}
export interface PredictiveInsight {
    type: 'trend' | 'anomaly' | 'forecast' | 'recommendation';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    titleAr?: string;
    description: string;
    descriptionAr?: string;
    confidence: number;
    predictedValue?: number;
    predictedDate?: string;
    actionItems?: string[];
    drillThrough?: DrillThroughPath;
}
export interface RealTimeMetric {
    name: string;
    nameAr?: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
    lastUpdated: string;
    source: 'worker' | 'orchestrator' | 'command-center' | 'database';
}
