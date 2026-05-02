export interface AuthorizationCheckInput {
    entityType?: string;
    entityId?: string;
    scopeType?: string;
    scopeId?: string;
}
export interface AuthorizationDecision {
    allowed: boolean;
    reason: string;
    authority?: string;
    delegated?: boolean;
}
export declare function can(tenantId: string, userId: string, action: string, opts?: AuthorizationCheckInput): Promise<AuthorizationDecision>;
