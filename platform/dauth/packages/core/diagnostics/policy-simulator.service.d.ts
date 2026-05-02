import { type AccessDecision } from '../access/decision-engine';
export interface SimulateCanInput {
    tenantId: string;
    userId: string;
    action: string;
    /** Role set to substitute — defaults to the user's current roles. */
    roles?: string[];
    /** Override attributes for the simulation. */
    attributes?: Record<string, unknown>;
    /** Optional resource context. */
    resource?: {
        type: string;
        id?: string;
        tenantId?: string;
        createdBy?: string;
        status?: string;
        attributes?: Record<string, unknown>;
    };
    scopeType?: string;
    scopeId?: string;
    authorityRequired?: string;
    lifecycleFromState?: string;
    lifecycleToState?: string;
    ownershipRequired?: boolean;
}
export interface SimulateCanResult {
    decisionId: string;
    allowed: boolean;
    reasonCode?: string;
    reason: string;
    steps: AccessDecision['steps'];
    engineResults?: Record<string, unknown>;
    obligations?: Record<string, unknown>;
    policyVersion?: string;
    modelVersion?: string;
    /** Indicates the simulation did not write to the ledger. */
    wroteLedger: false;
}
export declare function simulateCan(input: SimulateCanInput): Promise<SimulateCanResult>;
export interface SimulateRoleGrantInput {
    tenantId: string;
    userId: string;
    roles: string[];
    actions: string[];
}
export interface SimulateRoleGrantResult {
    tenantId: string;
    userId: string;
    roles: string[];
    perAction: Array<{
        action: string;
        allowed: boolean;
        reasonCode?: string;
        reason: string;
    }>;
    summary: {
        allowed: number;
        denied: number;
    };
}
export declare function simulateRoleGrant(input: SimulateRoleGrantInput): Promise<SimulateRoleGrantResult>;
