export declare const FOUNDATION_ENTITY_TYPES: readonly ["organization", "business_unit", "department", "position", "legal_entity"];
export declare const FOUNDATION_STATUSES: readonly ["draft", "in_review", "approved", "published", "active", "suspended", "archived"];
export declare const FOUNDATION_DEFAULT_STATUS = "draft";
export declare const FOUNDATION_LIMITS: {
    readonly maxDepth: 10;
    readonly maxChildrenPerNode: 100;
    readonly maxNodesPerTenant: 5000;
};
