export interface CompletionStatus {
    actionId: string;
    status: string;
    evidenceCount: number;
    submittedBy: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    completedAt: string | null;
    verificationRequired: boolean;
    verificationMethod: string | null;
    progressPercent: number;
}
export interface CompletionReadiness {
    ready: boolean;
    reasons: string[];
}
/** Get the completion status for an action item including evidence count. */
export declare function getCompletionStatus(tenantId: string, actionId: string): Promise<CompletionStatus>;
/** Validate whether an action item is ready for completion submission. */
export declare function validateCompletionReadiness(tenantId: string, actionId: string): Promise<CompletionReadiness>;
/** Record verification of a completed action item. */
export declare function recordVerification(tenantId: string, actionId: string, verifiedBy: string): Promise<{
    actionId: string;
    verifiedBy: string;
    verifiedAt: string;
}>;
