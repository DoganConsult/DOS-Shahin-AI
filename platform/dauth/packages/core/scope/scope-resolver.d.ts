export interface EffectiveScope {
    tenantId: string;
    organizationIds: string[];
    businessUnitIds: string[];
    departmentIds: string[];
    sectionIds: string[];
    teamIds: string[];
    positionIds: string[];
}
/** Full hierarchy including per-organization breakdown. */
export interface FullScopeHierarchy extends EffectiveScope {
    hierarchy: {
        organizationId: string;
        businessUnitIds: string[];
        departmentIds: string[];
        sectionIds: string[];
        teamIds: string[];
        positionIds: string[];
    }[];
}
/**
 * Resolve the base effective scope from user_role_assignments.
 * Reads direct scope bindings (scope_type + scope_id) for the user.
 */
export declare function resolveUserScope(tenantId: string, userId: string): Promise<EffectiveScope>;
/**
 * Resolve full hierarchy with scope inheritance.
 * Expands each assigned scope level downward through the foundation tables:
 *   organizations -> business_units -> departments (+ child depts as sections) -> teams -> positions
 */
export declare function resolveFullHierarchy(tenantId: string, userId: string): Promise<FullScopeHierarchy>;
/**
 * Given a position, walk up the foundation tables to resolve which
 * organization, business unit, department, and section it belongs to.
 * Uses real foundation tables: positions -> departments -> business_units -> organizations.
 */
export declare function resolveScopeFromPosition(tenantId: string, positionId: string): Promise<{
    organizationId: string | null;
    businessUnitId: string | null;
    departmentId: string | null;
    sectionId: string | null;
}>;
/**
 * Check if a user's effective scope includes a specific target scope.
 * Uses full hierarchy resolution with inheritance to determine access.
 */
export declare function isWithinScope(tenantId: string, userId: string, targetScopeType: string, targetScopeId: string): Promise<boolean>;
/**
 * Merge multiple EffectiveScope objects, deduplicating IDs across all arrays.
 * All scopes must share the same tenantId; the first tenantId is used.
 */
export declare function mergeScopes(scopes: EffectiveScope[]): EffectiveScope;
