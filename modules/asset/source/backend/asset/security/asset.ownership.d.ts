export interface ASSETOwnershipRule {
    entityType: string;
    defaultOwnerRole: string;
    canDelegate: boolean;
    requiresApproval: boolean;
    ownershipField: string;
    descriptionEn: string;
}
export declare const ASSET_OWNERSHIP_RULES: ASSETOwnershipRule[];
