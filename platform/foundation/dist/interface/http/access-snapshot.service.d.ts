import { type OrgScope } from './org-scope.service';
import { type ManagerChainEntry } from './org-hierarchy.service';
export interface DeniedActionEntry {
    actionCode: string;
    reasonCode: string;
    correlationId?: string;
}
export interface PendingApprovalEntry {
    entityType: string;
    entityId: string;
    requiredAuthority: string;
    requestedAt: string;
}
export interface SlaBreachEntry {
    entityType: string;
    entityId: string;
    breachAt: string;
    escalationLevel: number;
}
export interface EscalationEntry {
    entityType: string;
    entityId: string;
    escalatedTo: string;
    reason: string;
}
export interface InheritedPolicyEntry {
    policyCode: string;
    source: string;
    level: number;
}
export interface FoundationAccessSnapshot {
    actor: {
        userId: string;
        tenantId: string;
    };
    /** From Foundation: primary position metadata. */
    currentPosition: OrgScope['primaryPosition'];
    /** Derived role-profile code (best-effort; refined by DAuth when present). */
    currentRoleProfile: string | null;
    /** Foundation org/BU ancestor chain. */
    orgScope: {
        businessUnits: OrgScope['businessUnits'];
        organizations: OrgScope['organizations'];
        allPositionIds: string[];
    };
    /** Manager chain from primary position upward. */
    managerChain: ManagerChainEntry[];
    /** Pending approvals where the user is the maker; from authz_decision_log. */
    pendingApprovals: PendingApprovalEntry[];
    /** Denials in the recent window — debug aid for FE. Capped at 50. */
    deniedActions: DeniedActionEntry[];
    /** SLA breaches for entities the user owns or supervises. */
    slaBreaches: SlaBreachEntry[];
    /** Escalations where the user is currently the escalation target. */
    escalations: EscalationEntry[];
    /** Policies inherited from ancestor scopes. */
    inheritedPolicies: InheritedPolicyEntry[];
    /** Trace metadata. */
    audit: {
        snapshotGeneratedAt: string;
        correlationId: string;
    };
}
export declare function getAccessSnapshot(tenantId: string, userId: string, correlationId?: string): Promise<FoundationAccessSnapshot>;
