import type { DeploymentRecord, MigrationRecord, RollbackRecord } from '../contracts/delivery.types';
export interface DeliveryDiagnosticsReport {
    generatedAt: string;
    failedDeployments: DeploymentRecord[];
    stuckMigrations: MigrationRecord[];
    recentRollbacks: RollbackRecord[];
    releasesWithMissingApprovals: Array<{
        releaseId: string;
        releaseCode: string;
        missing: string[];
    }>;
    irreversibleMigrationsWithoutApproval: MigrationRecord[];
}
export declare function generateDeliveryDiagnosticsReport(): Promise<DeliveryDiagnosticsReport>;
export declare function checkReleaseReadiness(releaseId: string): Promise<{
    ready: boolean;
    blockers: string[];
}>;
