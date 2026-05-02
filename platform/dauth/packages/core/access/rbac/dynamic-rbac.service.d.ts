export interface ActivationRule {
    roleCode: string;
    moduleCode: string;
    active: boolean;
    reason: string;
}
export interface EffectivePermission {
    permissionCode: string;
    module: string;
    active: boolean;
}
/**
 * Returns the activation state of every role in the tenant schema,
 * resolving against the tenant's module entitlements.
 *
 * Rules:
 *  - Platform-tier and tenant-tier roles are always active.
 *  - Module-tier roles are active only if their associated module is enabled.
 *  - Roles not linked to any module default to active.
 */
export declare function getActivationRules(tenantId: string): Promise<ActivationRule[]>;
/**
 * Returns the effective permissions for a user, filtered by module
 * activation status. Permissions linked to disabled modules are
 * excluded even if the user holds them via role assignment.
 */
export declare function getEffectivePermissions(tenantId: string, userId: string): Promise<EffectivePermission[]>;
/**
 * Returns the list of role codes that are both assigned to the user
 * AND active per module entitlements.
 */
export declare function getActiveRolesForUser(tenantId: string, userId: string): Promise<string[]>;
