import { z } from 'zod';
export declare const assignPermissionBody: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCode: z.ZodString;
    scopeType: z.ZodDefault<z.ZodEnum<{
        tenant: "tenant";
        department: "department";
        team: "team";
        entity: "entity";
        workspace: "workspace";
    }>>;
    scopeId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const revokePermissionParams: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCode: z.ZodString;
}, z.core.$strip>;
export declare const bulkAssignPermissionsBody: z.ZodObject<{
    roleCode: z.ZodString;
    permissionCodes: z.ZodArray<z.ZodString>;
    scopeType: z.ZodDefault<z.ZodEnum<{
        tenant: "tenant";
        department: "department";
        team: "team";
        entity: "entity";
        workspace: "workspace";
    }>>;
    scopeId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const createRoleBody: z.ZodObject<{
    code: z.ZodString;
    moduleCode: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const updateRoleBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const assignRoleBody: z.ZodObject<{
    userId: z.ZodString;
    functionalRoleCode: z.ZodString;
    moduleCode: z.ZodString;
    scopeType: z.ZodDefault<z.ZodEnum<{
        tenant: "tenant";
        department: "department";
        team: "team";
        entity: "entity";
        workspace: "workspace";
    }>>;
    scopeId: z.ZodOptional<z.ZodString>;
    authorityLevel: z.ZodOptional<z.ZodEnum<{
        view: "view";
        operate: "operate";
        approve_low: "approve_low";
        approve_medium: "approve_medium";
        approve_high: "approve_high";
        override: "override";
    }>>;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const revokeRoleAssignmentBody: z.ZodObject<{
    userId: z.ZodString;
    functionalRoleCode: z.ZodString;
    moduleCode: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const accessProfileBody: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const assignProfileBody: z.ZodObject<{
    userId: z.ZodString;
    accessProfileCode: z.ZodString;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const rbacListQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    moduleCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    roleCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    search: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type AssignPermissionInput = z.infer<typeof assignPermissionBody>;
export type BulkAssignPermissionsInput = z.infer<typeof bulkAssignPermissionsBody>;
export type CreateRoleInput = z.infer<typeof createRoleBody>;
export type UpdateRoleInput = z.infer<typeof updateRoleBody>;
export type AssignRoleInput = z.infer<typeof assignRoleBody>;
export type RevokeRoleAssignmentInput = z.infer<typeof revokeRoleAssignmentBody>;
export type AccessProfileInput = z.infer<typeof accessProfileBody>;
export type AssignProfileInput = z.infer<typeof assignProfileBody>;
