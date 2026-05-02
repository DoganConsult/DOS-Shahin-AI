export interface FunctionalRole {
    roleId: string;
    roleCode: string;
    nameEn: string;
    nameAr: string;
    moduleCode: string | null;
    isSystem: boolean;
    isActive: boolean;
}
export declare function getFunctionalRoles(tenantId: string, moduleCode?: string): Promise<FunctionalRole[]>;
export declare function getFunctionalRole(tenantId: string, roleCode: string): Promise<FunctionalRole | null>;
export declare function createFunctionalRole(tenantId: string, role: Omit<FunctionalRole, 'roleId' | 'isActive'>, createdBy: string): Promise<FunctionalRole>;
export declare function deactivateFunctionalRole(tenantId: string, roleCode: string, deactivatedBy: string): Promise<boolean>;
export declare function getRolePermissions(tenantId: string, roleCode: string): Promise<string[]>;
