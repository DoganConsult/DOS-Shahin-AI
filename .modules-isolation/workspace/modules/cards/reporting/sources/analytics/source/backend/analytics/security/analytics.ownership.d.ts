interface ANALYTICS_OwnershipRule {
    entityType: string;
    defaultOwnerRole: string;
    canDelegate: boolean;
    requiresApproval: boolean;
    ownershipField: string;
    descriptionEn: string;
}
export declare const ANALYTICS_OWNERSHIP_RULES: ANALYTICS_OwnershipRule[];
export {};
