export declare function getCoverageReport(tenantId: string): Promise<any[]>;
export declare function getAgingReport(tenantId: string): Promise<any[]>;
export declare function getOrphanReport(tenantId: string): Promise<{
    orphanAssets: any[];
    orphanApplications: any[];
    summary: {
        orphanAssetCount: number;
        orphanAppCount: number;
    };
}>;
export declare function getClassificationReport(tenantId: string): Promise<any[]>;
export declare function getDashboardSummary(tenantId: string): Promise<any>;
