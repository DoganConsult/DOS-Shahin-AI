export interface SelfApprovalCheck {
    allowed: boolean;
    reason: string;
}
export declare function checkSelfApproval(tenantId: string, actorId: string, entityType: string, entityId: string, action: string): Promise<SelfApprovalCheck>;
export declare function isSelfApprovalAllowed(tenantId: string): Promise<boolean>;
export declare function getEntityCreator(tenantId: string, entityType: string, entityId: string): Promise<string | null>;
