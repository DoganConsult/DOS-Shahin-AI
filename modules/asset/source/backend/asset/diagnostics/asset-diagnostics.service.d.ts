export interface AssetDiagnosticsReport {
    moduleCode: string;
    tenantId: string;
    generatedAt: string;
    inventoryHealth: InventoryHealthResult;
    classificationHealth: ClassificationHealthResult;
    lifecycleHealth: LifecycleHealthResult;
    overallHealth: 'healthy' | 'degraded' | 'critical';
    warnings: string[];
    errors: string[];
}
export interface InventoryHealthResult {
    unclassifiedAssets: number;
    assetsWithoutOwner: number;
    assetsApproachingEol: number;
    assetsPassedEol: number;
    issues: string[];
}
export interface ClassificationHealthResult {
    overdueReviews: number;
    criticalUnreviewed: number;
    issues: string[];
}
export interface LifecycleHealthResult {
    stuckInDecommission: number;
    noMaintenanceSchedule: number;
    overdueDisposal: number;
    issues: string[];
}
export declare class AssetDiagnosticsService {
    runDiagnostics(tenantId: string): Promise<AssetDiagnosticsReport>;
}
