import type { DeploymentRecord } from '../contracts/delivery.types';
export declare function startDeployment(input: {
    releaseId: string;
    tenantId: string;
    environment: string;
    deployedBy: string;
}): Promise<DeploymentRecord>;
export declare function completeDeployment(tenantId: string, deploymentId: string): Promise<void>;
export declare function failDeployment(tenantId: string, deploymentId: string, reason: string): Promise<void>;
export declare function markDeploymentRolledBack(tenantId: string, deploymentId: string, rollbackId: string): Promise<void>;
export declare function getDeployment(tenantId: string, deploymentId: string): Promise<DeploymentRecord | null>;
export declare function listDeployments(tenantId: string, environment?: string): Promise<DeploymentRecord[]>;
export declare function getDeploymentsByRelease(tenantId: string, releaseId: string): Promise<DeploymentRecord[]>;
export declare function getActiveDeployment(tenantId: string, environment: string): Promise<DeploymentRecord | null>;
