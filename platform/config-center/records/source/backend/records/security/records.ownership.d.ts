interface RECORDS_OwnershipRule {
    entityType: string;
    defaultOwnerRole: string;
    canDelegate: boolean;
    requiresApproval: boolean;
    ownershipField: string;
    descriptionEn: string;
}
export declare const RECORDS_OWNERSHIP_RULES: RECORDS_OwnershipRule[];
export {};
