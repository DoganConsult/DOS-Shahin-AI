export interface Permission {
    permissionId: string;
    permissionCode: string;
    nameEn: string;
    nameAr: string;
    moduleCode: string;
    isSystem: boolean;
    isActive: boolean;
}
export interface CreatePermissionInput {
    permissionCode: string;
    nameEn: string;
    nameAr: string;
    moduleCode: string;
    isSystem?: boolean;
}
/** Validates module.resource.action format — three dot-separated alphanumeric/underscore segments. */
export declare function validatePermissionFormat(code: string): boolean;
/** List permissions, optionally filtered by module code. */
export declare function getPermissions(tenantId: string, moduleCode?: string): Promise<Permission[]>;
/** Lookup a single permission by code. */
export declare function getPermission(tenantId: string, permissionCode: string): Promise<Permission | null>;
/** Create a new permission. Validates module.resource.action format. */
export declare function createPermission(tenantId: string, input: CreatePermissionInput, createdBy: string): Promise<Permission>;
/** Soft-deactivate a permission. System permissions are protected. */
export declare function deactivatePermission(tenantId: string, permissionCode: string, deactivatedBy: string): Promise<void>;
/** Get all permissions assigned to a functional role. */
export declare function getPermissionsByRole(tenantId: string, roleCode: string): Promise<Permission[]>;
/** Assign a permission to a functional role. */
export declare function assignPermissionToRole(tenantId: string, roleCode: string, permissionCode: string, assignedBy: string): Promise<void>;
/** Revoke a permission from a functional role. */
export declare function revokePermissionFromRole(tenantId: string, roleCode: string, permissionCode: string, revokedBy: string): Promise<void>;
