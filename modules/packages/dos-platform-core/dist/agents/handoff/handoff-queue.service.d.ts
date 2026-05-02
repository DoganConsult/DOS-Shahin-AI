export interface AgentHandoffMessage {
    id: string;
    agentId?: string;
    payload: unknown;
    createdAt: string;
}
export declare function enqueueHandoff(handoff: unknown): void;
export declare function getHandoffBatch(agentId: string, limit?: number): unknown[];
