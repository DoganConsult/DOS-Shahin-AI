export interface TrendDataPoint {
    date: Date;
    value: number;
    count: number;
}
export interface TrendAnalysis {
    metric: string;
    agentId?: string;
    period: 'daily' | 'weekly' | 'monthly';
    dataPoints: TrendDataPoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
    trendStrength: number;
    avgValue: number;
    minValue: number;
    maxValue: number;
    forecast?: {
        nextValue: number;
        confidence: number;
    };
}
/**
 * Analyze historical trends
 */
export declare function analyzeTrends(tenantId: string, metric: 'latency' | 'success_rate' | 'cost' | 'error_rate' | 'usage', agentId?: string, period?: 'daily' | 'weekly' | 'monthly', daysBack?: number): Promise<TrendAnalysis>;
/**
 * Get trend summary for dashboard
 */
export declare function getTrendSummary(tenantId: string, agentId?: string): Promise<{
    latency: TrendAnalysis;
    successRate: TrendAnalysis;
    cost: TrendAnalysis;
}>;
