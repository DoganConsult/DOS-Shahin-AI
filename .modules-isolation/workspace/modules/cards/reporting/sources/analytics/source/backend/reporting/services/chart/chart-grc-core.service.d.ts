export interface GrcCoreDashboardData {
    controlsByDomain: {
        domain: string;
        total: number;
        implemented: number;
        tested: number;
    }[];
    frameworkScores: {
        name: string;
        score: number;
        controlCount: number;
    }[];
    evidenceByStatus: {
        status: string;
        count: number;
    }[];
    risksByTreatment: {
        status: string;
        count: number;
    }[];
    recentActivity: {
        date: string;
        module: string;
        action: string;
        summary: string;
    }[];
}
export declare function getGrcCoreDashboard(tenantId: string): Promise<GrcCoreDashboardData>;
