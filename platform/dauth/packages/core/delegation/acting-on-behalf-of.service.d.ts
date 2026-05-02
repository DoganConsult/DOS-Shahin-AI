export interface ActingOnBehalfOfContext {
    delegateId: string;
    principalId: string;
    tenantId: string;
    grantId: string;
    scopes: string[];
    expiresAt: string;
}
export declare function resolveActingContext(tenantId: string, delegateId: string, grantId: string): Promise<ActingOnBehalfOfContext | null>;
export declare function evaluateDelegatedAccess(ctx: ActingOnBehalfOfContext, permissionCode: string, moduleCode: string): Promise<{
    allowed: boolean;
    reason: string;
}>;
