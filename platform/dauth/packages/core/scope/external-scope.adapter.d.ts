export interface ExternalScope {
    scopeId: string;
    userId: string;
    role: string;
    entityType: string;
    entityId: string;
    permissions: string[];
}
/**
 * Resolve all external scope grants for a user.
 * Returns the list of entities and permissions the external user can access.
 */
export declare function resolveExternalScope(tenantId: string, userId: string): Promise<ExternalScope[]>;
/**
 * Check if an external user has scope over a specific entity.
 */
export declare function isWithinExternalScope(tenantId: string, userId: string, targetEntityType: string, targetEntityId: string): Promise<boolean>;
/**
 * Check if an external user has a specific permission on a specific entity.
 */
export declare function hasExternalPermission(tenantId: string, userId: string, entityType: string, entityId: string, permission: string): Promise<boolean>;
/**
 * Get all entity IDs of a given type that an external user can access.
 */
export declare function getExternalEntityIds(tenantId: string, userId: string, entityType: string): Promise<string[]>;
