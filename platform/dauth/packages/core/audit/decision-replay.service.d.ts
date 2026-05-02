export interface ReplayDecisionInput {
    tenantId: string;
    decisionId?: string;
    correlationId?: string;
}
export interface ReplayDecisionResult {
    found: boolean;
    decisionId?: string;
    action?: string;
    originalDecision?: 'allow' | 'deny';
    originalReasonCode?: string;
    originalPolicyVersion?: string;
    originalModelVersion?: string;
    replayedAllowed?: boolean;
    replayedReasonCode?: string;
    replayedPolicyVersion?: string;
    replayedModelVersion?: string;
    /** True if the replayed verdict matches the original. */
    identical?: boolean;
    /** Fields that differ between original and replay. */
    delta?: string[];
}
export declare function replayDecision(input: ReplayDecisionInput): Promise<ReplayDecisionResult>;
