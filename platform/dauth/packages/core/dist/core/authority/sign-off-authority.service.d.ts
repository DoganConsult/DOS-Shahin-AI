export interface SignOffRequirement {
    entityType: string;
    transitionAction: string;
    requiredAuthorityCode: string;
    minSignOffs: number;
    requiresDifferentActors: boolean;
}
export declare function getSignOffRequirements(tenantId: string, entityType: string, transitionAction: string): Promise<SignOffRequirement | null>;
export declare function canSignOff(tenantId: string, userId: string, entityType: string, entityId: string, transitionAction: string): Promise<{
    allowed: boolean;
    reason: string;
}>;
export declare function recordSignOff(tenantId: string, userId: string, entityType: string, entityId: string, transitionAction: string): Promise<void>;
