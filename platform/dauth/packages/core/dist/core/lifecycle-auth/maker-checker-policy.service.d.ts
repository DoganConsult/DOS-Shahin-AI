import type { MakerCheckerDecision } from '../types/dauth.types';
export interface MakerCheckerPolicy {
    entityType: string;
    action: string;
    requiredCheckers: number;
    requireDifferentDepartment: boolean;
    isActive: boolean;
}
export declare function getMakerCheckerPolicy(tenantId: string, entityType: string, action: string): Promise<MakerCheckerPolicy | null>;
export declare function submitForChecking(tenantId: string, makerId: string, entityType: string, entityId: string, action: string): Promise<MakerCheckerDecision>;
export declare function approveDecision(tenantId: string, decisionId: string, checkerId: string, reason?: string): Promise<{
    success: boolean;
    reason: string;
}>;
export declare function rejectDecision(tenantId: string, decisionId: string, checkerId: string, reason: string): Promise<{
    success: boolean;
    reason: string;
}>;
export declare function getPendingDecisions(tenantId: string): Promise<MakerCheckerDecision[]>;
