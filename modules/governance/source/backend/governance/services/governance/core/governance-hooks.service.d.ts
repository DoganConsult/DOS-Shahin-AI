export interface AuthorityCheck {
    authorized: boolean;
    requiredApproverRole?: string;
    delegationId?: string;
    reason?: string;
}
/**
 * Check if a user has authority to accept a risk, based on the authority matrix
 * and active delegations.
 */
export declare function checkRiskAcceptanceAuthority(tenantId: string, riskId: string, userId: string): Promise<AuthorityCheck>;
/**
 * Create a governance action item when a control fails.
 */
export declare function createGovernanceActionFromControlFailure(tenantId: string, controlId: string, severity: string): Promise<void>;
/**
 * Escalate a critical/high audit finding to governance by creating an action item.
 */
export declare function escalateAuditFindingToGovernance(tenantId: string, findingId: string, severity: string): Promise<void>;
/**
 * Escalate a critical incident to the governance body by creating an action item + agenda item.
 */
export declare function escalateIncidentToGovernanceBody(tenantId: string, incidentId: string, severity: string): Promise<void>;
/**
 * Escalate ethics report to governance body.
 */
export declare function escalateEthicsReportToGovernance(tenantId: string, reportId: string, severity: string): Promise<void>;
/**
 * Escalate security vulnerability to governance when severity >= HIGH.
 */
export declare function escalateSecurityEventToGovernance(tenantId: string, entityId: string, eventType: string, severity: string, title: string): Promise<void>;
/**
 * Aggregate critical items across all modules that require board attention.
 */
export declare function getBoardAttentionItems(tenantId: string): Promise<unknown>;
export interface QiyasDimension {
    dimension: string;
    score: number;
    grade: string;
    source: string;
}
/**
 * Feed governance health dimensions into Qiyas maturity calculation.
 */
export declare function getGovernanceQiyasDimensions(tenantId: string): Promise<QiyasDimension[]>;
export interface StaleEvidenceImpact {
    evidence_id: string;
    title: string;
    expiry_date: string;
    linked_controls: number;
    governance_impact: string;
}
export declare function getStaleEvidenceGovernanceImpact(tenantId: string): Promise<StaleEvidenceImpact[]>;
export declare function createGovernanceActionFromStaleEvidence(tenantId: string, evidenceId: string, title: string): Promise<void>;
/**
 * Register all governance cross-module event subscriptions.
 * Call this during application startup.
 */
export declare function registerGovernanceEventSubscriptions(): Promise<void>;
