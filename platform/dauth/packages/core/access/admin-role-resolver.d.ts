/** Check if a profile code grants admin-level access. */
export declare function isAdminProfile(tenantId: string, profileCode: string): Promise<boolean>;
/** Check if a profile code grants full module visibility. */
export declare function isFullAccessProfile(tenantId: string, profileCode: string): Promise<boolean>;
/** Get all admin profile codes for a tenant. */
export declare function getAdminProfiles(tenantId: string): Promise<Set<string>>;
/** Get all full-access profile codes for a tenant. */
export declare function getFullAccessProfiles(tenantId: string): Promise<Set<string>>;
/** Invalidate cache. */
export declare function invalidateAdminRoleCache(tenantId?: string): void;
