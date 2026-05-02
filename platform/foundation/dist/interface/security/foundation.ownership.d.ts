export interface FoundationOwnershipRule {
    entityType: string;
    defaultOwnerRole: string;
    canDelegate: boolean;
    requiresApproval: boolean;
    ownershipField: string;
    descriptionEn: string;
}
export declare const FOUNDATION_OWNERSHIP_RULES: FoundationOwnershipRule[];
