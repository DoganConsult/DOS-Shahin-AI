export interface DelegationPolicy {
    policyId: string;
    roleCode: string;
    maxDurationHours: number;
    allowedScopes: string[];
    allowedActions: string[];
    requiresApproval: boolean;
    isActive: boolean;
}
export declare function getDelegationPolicies(tenantId: string): Promise<DelegationPolicy[]>;
export declare function getDelegationPolicyForRole(tenantId: string, roleCode: string): Promise<DelegationPolicy | null>;
export declare function validateDelegationRequest(tenantId: string, delegatorRoles: string[], requestedScopes: string[], requestedDurationHours: number): Promise<{
    valid: boolean;
    reason: string;
}>;
export interface DelegationRule {
    rule_id: string;
    tenant_id: string;
    user_id: string;
    agent_id: string;
    action_type: string;
    allowed: boolean;
    max_risk_level: string;
    requires_notification: boolean;
    time_window_start: string | null;
    time_window_end: string | null;
    max_per_day: number;
    notes: string | null;
}
export interface DelegationCheckResult {
    allowed: boolean;
    reason: string;
    requiresNotification: boolean;
}
export declare function evaluateDelegation(tenantId: string, userId: string, agentId: string, actionType: string, riskLevel: string): Promise<DelegationCheckResult>;
export declare function incrementDailyActions(tenantId: string, userId: string): Promise<void>;
export declare function getDelegationRules(tenantId: string, userId: string): Promise<DelegationRule[]>;
export declare function upsertDelegationRule(tenantId: string, userId: string, rule: {
    agentId: string;
    actionType: string;
    allowed?: boolean;
    maxRiskLevel?: string;
    requiresNotification?: boolean;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    maxPerDay?: number;
    notes?: string;
}): Promise<string | null>;
export declare function deleteDelegationRule(tenantId: string, ruleId: string): Promise<boolean>;
