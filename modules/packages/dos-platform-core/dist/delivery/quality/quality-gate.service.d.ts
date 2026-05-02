import type { QualityGate, QualityGateStatus } from '../contracts/delivery.types';
export declare function registerQualityGate(input: {
    releaseId: string;
    gateCode: string;
    category: QualityGate['category'];
    owner: string;
    passThreshold?: number;
}): Promise<QualityGate>;
export declare function evaluateQualityGate(gateId: string, status: QualityGateStatus, actualValue?: number, notes?: string): Promise<QualityGate | null>;
export declare function getQualityGate(gateId: string): Promise<QualityGate | null>;
export declare function listQualityGatesByRelease(releaseId: string): Promise<QualityGate[]>;
export declare function listFailingGates(releaseId: string): Promise<QualityGate[]>;
export declare function isReleaseQualityApproved(releaseId: string): Promise<{
    approved: boolean;
    failingGates: QualityGate[];
    pendingGates: QualityGate[];
}>;
export declare function skipQualityGate(gateId: string, reason: string): Promise<void>;
