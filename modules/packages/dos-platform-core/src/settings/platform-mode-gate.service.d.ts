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
