export interface AgentSodDelegationCheck {
    tenantId: string;
    agentId: string;
    principalId: string;
    actionType: string;
    entityType?: string;
    entityId?: string | null;
    requiredPermissions?: string[];
}
export declare function checkAgentSodDelegation(input: AgentSodDelegationCheck): Promise<{
    allowed: boolean;
    reason?: string;
}>;
