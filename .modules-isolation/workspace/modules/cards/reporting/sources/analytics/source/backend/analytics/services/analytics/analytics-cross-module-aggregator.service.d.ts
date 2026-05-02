export interface GRCHealthDashboard {
    tenantId: string;
    riskPosture: {
        score: number;
        criticalCount: number;
        openCount: number;
    };
    compliancePosture: {
        score: number;
        frameworkCount: number;
        gapCount: number;
    };
    auditPosture: {
        closureRate: number;
        openFindings: number;
        criticalFindings: number;
    };
    vendorPosture: {
        avgScore: number;
        criticalVendors: number;
        totalVendors: number;
    };
    incidentPosture: {
        openCount: number;
        avgResolutionHours: number;
        criticalOpen: number;
    };
    remediationPosture: {
        completionRate: number;
        overdueCount: number;
        inProgressCount: number;
    };
    trainingPosture: {
        coverageRate: number;
        pendingCount: number;
    };
    compositeScore: number;
    assessedAt: string;
}
export declare function computeGRCHealthDashboard(tenantId: string): Promise<GRCHealthDashboard>;
export declare function registerAnalyticsCrossModuleSubscribers(): void;
