export interface UnifiedRole {
    roleCode: string;
    nameEn: string;
    source: 'enterprise' | 'legacy';
    isSystem: boolean;
    isActive: boolean;
}
export interface UnifiedPermission {
    permissionCode: string;
    nameEn: string;
    moduleCode: string;
    source: 'enterprise' | 'legacy';
}
/**
 * Get all roles for a user, merging enterprise (163) and legacy (030) systems.
 * Enterprise roles take precedence.
 */
export declare function getUnifiedUserRoles(tenantId: string, userId: string): Promise<UnifiedRole[]>;
/**
 * Get all effective permissions for a user, merging both systems.
 * Enterprise permissions take precedence.
 */
export declare function getUnifiedUserPermissions(tenantId: string, userId: string): Promise<string[]>;
/**
 * Get diagnostic report showing which system each role comes from.
 * Useful for tracking migration progress from 030 → 163.
 */
export declare function getAuthSystemDiagnostics(tenantId: string): Promise<{
    enterpriseRoleCount: number;
    legacyRoleCount: number;
    enterprisePermissionCount: number;
    legacyPermissionCount: number;
    bridgeStatus: 'enterprise_primary' | 'dual_active' | 'legacy_only';
}>;
