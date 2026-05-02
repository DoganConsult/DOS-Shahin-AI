export interface AnalyticalDashboardData {
    riskDistribution: {
        category: string;
        count: number;
    }[];
    complianceTrend: {
        date: string;
        score: number;
    }[];
    controlEffectiveness: {
        domain: string;
        effective: number;
        total: number;
    }[];
    topFindings: {
        title: string;
        severity: string;
        count: number;
    }[];
}
export declare function getAnalyticalDashboard(tenantId: string): Promise<AnalyticalDashboardData>;
