import { z } from 'zod';
export declare const assignPermissionBody: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCode: z.ZodString;
    scopeType: z.ZodDefault<z.ZodEnum<["tenant", "workspace", "department", "team", "entity"]>>;
    scopeId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    permissionCode?: string;
    roleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
}, {
    permissionCode?: string;
    roleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
}>;
export declare const revokePermissionParams: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    permissionCode?: string;
    roleCode?: string;
}, {
    permissionCode?: string;
    roleCode?: string;
}>;
export declare const bulkAssignPermissionsBody: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCodes: z.ZodArray<z.ZodString, "many">;
    scopeType: z.ZodDefault<z.ZodEnum<["tenant", "workspace", "department", "team", "entity"]>>;
    scopeId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    roleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
    permissionCodes?: string[];
}, {
    roleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
    permissionCodes?: string[];
}>;
export declare const createRoleBody: z.ZodObject<{
    code: z.ZodString;
    moduleCode: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string;
    moduleCode?: string;
    description?: string;
    code?: string;
}, {
    name?: string;
    moduleCode?: string;
    description?: string;
    code?: string;
}>;
export declare const updateRoleBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string;
    description?: string;
}, {
    name?: string;
    description?: string;
}>;
export declare const assignRoleBody: z.ZodObject<{
    userId: z.ZodString;
    functionalRoleCode: z.ZodString;
    moduleCode: z.ZodString;
    scopeType: z.ZodDefault<z.ZodEnum<["tenant", "workspace", "department", "team", "entity"]>>;
    scopeId: z.ZodOptional<z.ZodString>;
    authorityLevel: z.ZodOptional<z.ZodEnum<["view", "operate", "approve_low", "approve_medium", "approve_high", "override"]>>;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    userId?: string;
    moduleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
    validFrom?: string;
    validTo?: string;
    functionalRoleCode?: string;
    authorityLevel?: "view" | "operate" | "approve_low" | "approve_medium" | "approve_high" | "override";
    isPrimary?: boolean;
}, {
    userId?: string;
    moduleCode?: string;
    scopeType?: "tenant" | "department" | "team" | "entity" | "workspace";
    scopeId?: string;
    validFrom?: string;
    validTo?: string;
    functionalRoleCode?: string;
    authorityLevel?: "view" | "operate" | "approve_low" | "approve_medium" | "approve_high" | "override";
    isPrimary?: boolean;
}>;
export declare const revokeRoleAssignmentBody: z.ZodObject<{
    userId: z.ZodString;
    functionalRoleCode: z.ZodString;
    moduleCode: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId?: string;
    reason?: string;
    moduleCode?: string;
    functionalRoleCode?: string;
}, {
    userId?: string;
    reason?: string;
    moduleCode?: string;
    functionalRoleCode?: string;
}>;
export declare const accessProfileBody: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name?: string;
    description?: string;
    code?: string;
}, {
    name?: string;
    description?: string;
    code?: string;
}>;
export declare const assignProfileBody: z.ZodObject<{
    userId: z.ZodString;
    accessProfileCode: z.ZodString;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId?: string;
    validFrom?: string;
    validTo?: string;
    accessProfileCode?: string;
}, {
    userId?: string;
    validFrom?: string;
    validTo?: string;
    accessProfileCode?: string;
}>;
export declare const rbacListQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    moduleCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    roleCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    search: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    moduleCode?: string;
    roleCode?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}, {
    moduleCode?: string;
    roleCode?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}>;
export type AssignPermissionInput = z.infer<typeof assignPermissionBody>;
export type BulkAssignPermissionsInput = z.infer<typeof bulkAssignPermissionsBody>;
export type CreateRoleInput = z.infer<typeof createRoleBody>;
export type UpdateRoleInput = z.infer<typeof updateRoleBody>;
export type AssignRoleInput = z.infer<typeof assignRoleBody>;
export type RevokeRoleAssignmentInput = z.infer<typeof revokeRoleAssignmentBody>;
export type AccessProfileInput = z.infer<typeof accessProfileBody>;
export type AssignProfileInput = z.infer<typeof assignProfileBody>;
