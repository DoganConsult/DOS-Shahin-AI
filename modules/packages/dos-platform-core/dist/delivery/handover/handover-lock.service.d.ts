import type { HandoverLock } from '../contracts/delivery.types';
export interface HandoverRiskItem {
    riskId: string;
    releaseId: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    owner: string;
    mitigationNotes: string | null;
    carryForward: boolean;
    createdAt: string;
}
export declare function createHandoverLock(input: {
    releaseId: string;
}): Promise<HandoverLock>;
export declare function updateHandoverChecklist(lockId: string, updates: Partial<{
    asBuiltUpdated: boolean;
    migrationsVerified: boolean;
    releaseNotesFinalized: boolean;
    knownRisksUpdated: boolean;
    operationalDashboardsConfirmed: boolean;
    supportOwnerConfirmed: boolean;
    cutoverOutcome: string;
    rollbackOutcome: string;
}>): Promise<HandoverLock | null>;
export declare function lockHandover(lockId: string, lockedBy: string): Promise<HandoverLock | null>;
export declare function validateHandoverReadiness(lock: HandoverLock): string[];
export declare function getHandoverLock(lockId: string): Promise<HandoverLock | null>;
export declare function getHandoverLockByRelease(releaseId: string): Promise<HandoverLock | null>;
export declare function registerRiskItem(input: {
    releaseId: string;
    description: string;
    severity: HandoverRiskItem['severity'];
    owner: string;
    mitigationNotes?: string;
    carryForward?: boolean;
}): Promise<HandoverRiskItem>;
export declare function getRiskItem(riskId: string): Promise<HandoverRiskItem | null>;
export declare function listRisksByRelease(releaseId: string): Promise<HandoverRiskItem[]>;
export declare function listCarryForwardRisks(): Promise<HandoverRiskItem[]>;
