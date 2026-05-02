export interface ACTIONOwnershipRule {
    entityType: string;
    defaultOwnerRole: string;
    canDelegate: boolean;
    requiresApproval: boolean;
    ownershipField: string;
    descriptionEn: string;
}
export declare const ACTION_OWNERSHIP_RULES: ACTIONOwnershipRule[];
