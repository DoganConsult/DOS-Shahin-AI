import type { RollbackRecord, RollbackStatus } from '../contracts/delivery.types';
export declare function initiateRollback(input: {
    deploymentId: string;
    releaseId: string;
    tenantId: string;
    triggeredBy: string;
    triggerReason: string;
    dataIntegrityNotes?: string;
}): Promise<RollbackRecord>;
export declare function advanceRollbackStatus(tenantId: string, rollbackId: string, newStatus: RollbackStatus, failureReason?: string): Promise<void>;
export declare function getRollback(tenantId: string, rollbackId: string): Promise<RollbackRecord | null>;
export declare function getRollbackByDeployment(tenantId: string, deploymentId: string): Promise<RollbackRecord | null>;
export declare function listRollbacks(tenantId: string): Promise<RollbackRecord[]>;
