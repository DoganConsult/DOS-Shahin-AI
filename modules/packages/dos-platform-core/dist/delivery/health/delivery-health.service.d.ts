import type { DeliveryHealthSnapshot } from '../contracts/delivery.types';
export declare function getDeliveryHealthSnapshot(tenantId?: string): Promise<DeliveryHealthSnapshot>;
export declare function getDeploymentSuccessRateByEnvironment(tenantId: string, environment: string): Promise<number>;
export declare function getMigrationHealthByRelease(releaseId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    skipped: number;
}>;
