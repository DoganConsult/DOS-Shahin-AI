export interface RoleAssignment {
    assignmentId: string;
    userId: string;
    roleCode: string;
    moduleCode: string | null;
    scopeType: string | null;
    scopeId: string | null;
    isActive: boolean;
    validFrom: string;
    validTo: string | null;
    assignedBy: string;
}
export declare function assignRole(tenantId: string, userId: string, roleCode: string, opts: {
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    validTo?: string;
    assignedBy: string;
}): Promise<RoleAssignment>;
export declare function revokeRole(tenantId: string, userId: string, roleCode: string, revokedBy: string): Promise<boolean>;
export declare function getUserRoleAssignments(tenantId: string, userId: string): Promise<RoleAssignment[]>;
export declare function getRoleAssignmentsByRole(tenantId: string, roleCode: string): Promise<RoleAssignment[]>;
export declare function expireStaleAssignments(tenantId: string): Promise<number>;
