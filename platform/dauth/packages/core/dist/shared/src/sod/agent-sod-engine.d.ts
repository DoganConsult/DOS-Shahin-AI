/**
 * DAuth — Agent-aware Segregation of Duties.
 *
 * Extends the existing sod-engine (role-pair + action-pair conflicts for
 * human actors) to non-human principals. When either proposer or approver
 * is an agent / service_account / external, we consult agent_sod_policies
 * for a tenant-scoped outcome, falling back to 'escalate' when no policy
 * matches.
 */
export type PrincipalType = 'human' | 'agent' | 'service_account' | 'external';
export type SodOutcome = 'allow' | 'warn' | 'escalate' | 'block';
export interface ActorPair {
    id: string;
    type: PrincipalType;
}
export interface AgentSodDecision {
    allowed: boolean;
    outcome: SodOutcome;
    reason?: string;
    policyId?: string;
}
export declare function evaluateAgentSod(tenantId: string, proposer: ActorPair, approver: ActorPair, actionKey?: string): Promise<AgentSodDecision>;
