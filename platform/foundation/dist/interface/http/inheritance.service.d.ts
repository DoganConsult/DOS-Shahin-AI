export type InheritanceScopeType = 'organization' | 'business_unit' | 'department';
export interface InheritedItem {
    itemType: 'policy' | 'security_baseline' | 'sla' | 'approval_matrix' | 'sod_requirement';
    itemCode: string;
    itemId: string;
    scopeType: InheritanceScopeType;
    scopeId: string;
    scopeName: string;
    level: number;
    payload?: Record<string, unknown>;
}
/**
 * Resolve inheritance for a scope. Currently returns the ancestor chain
 * with empty itemized lists; downstream consumers (governance, workflow)
 * extend this by registering fetchers. The shape is stable so the FE can
 * already render the chain even before policy/SLA links are wired.
 */
export declare function getInheritance(tenantId: string, scopeType: InheritanceScopeType, scopeId: string): Promise<{
    scopeType: InheritanceScopeType;
    scopeId: string;
    chain: Array<{
        id: string;
        name: string;
        level: number;
    }>;
    inheritedItems: InheritedItem[];
}>;
