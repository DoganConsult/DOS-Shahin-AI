/**
 * Get all permission codes for a functional role from DB.
 * Results are cached for 5 minutes per tenant+role.
 */
export declare function getRolePermissionCodes(tenantId: string, roleCode: string): Promise<string[]>;
/**
 * Check if a role has a specific permission (DB-driven).
 */
export declare function hasRolePermission(tenantId: string, roleCode: string, permissionCode: string): Promise<boolean>;
/**
 * Get all permission codes for multiple roles (union), useful for users with multiple roles.
 */
export declare function getEffectivePermissionCodes(tenantId: string, roleCodes: string[]): Promise<string[]>;
/**
 * Invalidate cache for a tenant (call after role/permission changes).
 */
export declare function invalidateRolePermissionCache(tenantId?: string): void;
