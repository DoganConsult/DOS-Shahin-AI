export interface ExecutiveDashboardData {
    overallCompliance: number;
    riskScore: number;
    openFindings: number;
    evidenceCoverage: number;
    kpiSummary: {
        label: string;
        value: number;
        target: number;
        unit: string;
    }[];
    trendSummary: {
        metric: string;
        current: number;
        previous: number;
        direction: 'up' | 'down' | 'flat';
    }[];
}
export declare function getExecutiveDashboard(tenantId: string): Promise<ExecutiveDashboardData>;
