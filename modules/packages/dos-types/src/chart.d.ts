export interface MonteCarloResult {
    distribution: number[];
    mean: number;
    stdDev: number;
    percentiles: {
        p5: number;
        p25: number;
        p50: number;
        p75: number;
        p95: number;
    };
    meta?: {
        capped?: boolean;
        partial?: boolean;
    };
}
export interface WidgetDataEnvelope {
    widgetId?: string;
    dataType?: string;
    data?: unknown;
    meta?: Record<string, unknown>;
    fetchedAt?: string;
    [k: string]: unknown;
}
export interface RiskHeatmapData {
    cells?: Array<{
        likelihood: number;
        impact: number;
        count: number;
        riskIds?: string[];
    }>;
    [k: string]: unknown;
}
export interface ComplianceTrendData {
    periods?: Array<{
        date: string;
        score: number;
        frameworkCode?: string;
    }>;
    [k: string]: unknown;
}
export interface VendorBubbleData {
    vendors?: Array<{
        vendorId: string;
        name: string;
        riskScore: number;
        spendAmount: number;
        criticality: number;
    }>;
    [k: string]: unknown;
}
export interface MaturityRadarData {
    dimensions?: Array<{
        dimension: string;
        current: number;
        target: number;
    }>;
    [k: string]: unknown;
}
export interface FindingsBarData {
    categories?: Array<{
        category: string;
        open: number;
        closed: number;
        inProgress: number;
    }>;
    [k: string]: unknown;
}
export interface EvidenceDonutData {
    segments?: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    [k: string]: unknown;
}
export interface ControlSankeyData {
    nodes?: Array<{
        id: string;
        name: string;
    }>;
    links?: Array<{
        source: string;
        target: string;
        value: number;
    }>;
    [k: string]: unknown;
}
