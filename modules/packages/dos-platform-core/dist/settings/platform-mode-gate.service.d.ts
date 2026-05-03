export type PlatformMode = 'manual' | 'hybrid' | 'autonomous' | 'human' | 'copilot' | 'assisted' | 'hyper';
export declare function getTenantPlatformMode(tenantId: string): Promise<PlatformMode>;
export declare function getAgentPlatformMode(tenantId: string): Promise<PlatformMode>;
export declare function getModeDirective(mode: PlatformMode): string;
export declare function gateActionWithPolicy(tenantId: string, action: string, riskLevel?: 'low' | 'medium' | 'high'): Promise<{
    allowed: boolean;
    mode: PlatformMode;
    reason: string;
}>;
export declare function queuePendingAction(tenantId: string, actorIdOrAction: string | Record<string, unknown>, action?: Record<string, unknown>): Promise<string>;
export interface AgentRbacEntry {
    agentId: string;
    agentName: string;
    permissions: string[];
}
export declare function getAgentRbacEntries(): AgentRbacEntry[];
export interface PendingActionRow {
    pending_id: string;
    tenant_id: string;
    actor_id: string | null;
    agent_id?: string | null;
    action_type?: string;
    entity_type?: string | null;
    entity_id?: string | null;
    proposed_payload?: Record<string, unknown> | string;
    action_payload?: Record<string, unknown> | string;
    status: string;
    created_at: Date | string;
}
export declare function getPendingActions(tenantId: string, opts?: {
    agentId?: string;
    status?: string;
    limit?: number;
}): Promise<PendingActionRow[]>;
export declare function reviewPendingAction(tenantId: string, pendingId: string, reviewerId: string | undefined, approved: boolean, reviewNote?: string): Promise<{
    success: boolean;
    action?: PendingActionRow;
}>;
