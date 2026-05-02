interface AssignmentResult {
    bundles: string[];
    roles: string[];
    permissionsCount: number;
}
export declare function refreshUserPermissions(tenantId: string, userId: string): Promise<number>;
export declare function assignUserFromPlatformRole(tenantId: string, userId: string, platformRole: string): Promise<AssignmentResult>;
export declare function reassignUserOnRoleChange(tenantId: string, userId: string, oldRole: string, newRole: string): Promise<AssignmentResult>;
export declare function bulkAssignTenantUsers(tenantId: string): Promise<{
    usersProcessed: number;
}>;
export {};
