/**
 * Foundation Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner foundation
 * @module foundation
 * @since 2026-03-31
 */
import { z } from 'zod';
export declare const foundationNodeCreateBody: z.ZodObject<{
    entityType: z.ZodEnum<["organization", "business_unit", "department", "position", "legal_entity"]>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    nameEn: z.ZodString;
    nameAr: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    code: z.ZodString;
    ownerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    entityType?: "organization" | "business_unit" | "department" | "position" | "legal_entity";
    parentId?: string;
    code?: string;
    metadata?: Record<string, unknown>;
    nameAr?: string;
    nameEn?: string;
    ownerId?: string;
}, {
    entityType?: "organization" | "business_unit" | "department" | "position" | "legal_entity";
    parentId?: string;
    code?: string;
    metadata?: Record<string, unknown>;
    nameAr?: string;
    nameEn?: string;
    ownerId?: string;
}>;
export declare const foundationNodeUpdateBody: z.ZodObject<{
    nameEn: z.ZodOptional<z.ZodString>;
    nameAr: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    code: z.ZodOptional<z.ZodString>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    ownerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["draft", "in_review", "approved", "published", "active", "suspended", "archived"]>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    parentId?: string;
    status?: "draft" | "in_review" | "approved" | "published" | "active" | "suspended" | "archived";
    code?: string;
    metadata?: Record<string, unknown>;
    nameAr?: string;
    nameEn?: string;
    ownerId?: string;
}, {
    parentId?: string;
    status?: "draft" | "in_review" | "approved" | "published" | "active" | "suspended" | "archived";
    code?: string;
    metadata?: Record<string, unknown>;
    nameAr?: string;
    nameEn?: string;
    ownerId?: string;
}>;
export declare const foundationListQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
} & {
    entityType: z.ZodOptional<z.ZodEnum<["organization", "business_unit", "department", "position", "legal_entity"]>>;
    parentId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entityType?: "organization" | "business_unit" | "department" | "position" | "legal_entity";
    parentId?: string;
    status?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}, {
    entityType?: "organization" | "business_unit" | "department" | "position" | "legal_entity";
    parentId?: string;
    status?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}>;
export type FoundationNodeCreate = z.infer<typeof foundationNodeCreateBody>;
export type FoundationNodeUpdate = z.infer<typeof foundationNodeUpdateBody>;
export type FoundationListQuery = z.infer<typeof foundationListQuery>;
export declare const createInitiateBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const updateFoundationBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const createFoundationBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const updateRevokeBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const createDelegationsBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const createScanBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const updateResolveBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const createTransitionBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}, {
    description?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    title?: string;
}>;
export declare const createOrganizationSchema: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    org_type: z.ZodOptional<z.ZodEnum<["corporate", "government", "ngo", "academic", "other"]>>;
    country: z.ZodOptional<z.ZodString>;
    sector: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    metadata?: Record<string, unknown>;
    org_type?: "corporate" | "government" | "ngo" | "academic" | "other";
    country?: string;
    sector?: string;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    metadata?: Record<string, unknown>;
    org_type?: "corporate" | "government" | "ngo" | "academic" | "other";
    country?: string;
    sector?: string;
}>;
export declare const updateOrganizationSchema: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    org_type: z.ZodOptional<z.ZodOptional<z.ZodEnum<["corporate", "government", "ngo", "academic", "other"]>>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sector: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    metadata?: Record<string, unknown>;
    org_type?: "corporate" | "government" | "ngo" | "academic" | "other";
    country?: string;
    sector?: string;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    metadata?: Record<string, unknown>;
    org_type?: "corporate" | "government" | "ngo" | "academic" | "other";
    country?: string;
    sector?: string;
}>;
export declare const createBusinessUnitSchema: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    org_id: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    head_user_id: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    org_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    org_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const updateBusinessUnitSchema: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    org_id: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    head_user_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    org_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    org_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const createDepartmentSchema: z.ZodObject<{
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    bu_id: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    head_user_id: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    bu_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    bu_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const updateDepartmentSchema: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bu_id: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    head_user_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["draft", "active", "suspended", "archived"]>>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    bu_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}, {
    status?: "draft" | "active" | "suspended" | "archived";
    name_en?: string;
    name_ar?: string;
    code?: string;
    bu_id?: string;
    head_user_id?: string;
    metadata?: Record<string, unknown>;
}>;
export { createPositionBody as createPositionSchema, updatePositionBody as updatePositionSchema } from './positions.schemas';
export declare const delegationSchema: z.ZodObject<{
    delegatorId: z.ZodString;
    delegateId: z.ZodString;
    delegationType: z.ZodDefault<z.ZodEnum<["authority", "task", "approval", "review"]>>;
    scope: z.ZodDefault<z.ZodEnum<["org", "bu", "dept", "team", "module"]>>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string;
    scope?: "module" | "org" | "team" | "bu" | "dept";
    delegatorId?: string;
    delegateId?: string;
    delegationType?: "review" | "authority" | "task" | "approval";
    expiresAt?: string;
}, {
    reason?: string;
    scope?: "module" | "org" | "team" | "bu" | "dept";
    delegatorId?: string;
    delegateId?: string;
    delegationType?: "review" | "authority" | "task" | "approval";
    expiresAt?: string;
}>;
export declare const calculateSodCheckSchema: z.ZodObject<{
    resolution: z.ZodOptional<z.ZodEnum<["accepted", "mitigated", "reassigned", "rejected"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string;
    resolution?: "rejected" | "accepted" | "mitigated" | "reassigned";
}, {
    notes?: string;
    resolution?: "rejected" | "accepted" | "mitigated" | "reassigned";
}>;
export declare const createUserLifecycleSchema: z.ZodObject<{
    fromStatus: z.ZodString;
    toStatus: z.ZodString;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
}, {
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
}>;
export declare const assignOwnershipSchema: z.ZodObject<{
    entityType: z.ZodString;
    entityId: z.ZodString;
    ownerUserId: z.ZodString;
    ownerRole: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ownerUserId?: string;
    entityType?: string;
    entityId?: string;
    ownerRole?: string;
}, {
    ownerUserId?: string;
    entityType?: string;
    entityId?: string;
    ownerRole?: string;
}>;
export declare const grantAccessReviewSchema: z.ZodObject<{
    reviewStatus: z.ZodEnum<["approved", "rejected", "pending", "revoked"]>;
    comments: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reviewStatus?: "approved" | "rejected" | "pending" | "revoked";
    comments?: string;
}, {
    reviewStatus?: "approved" | "rejected" | "pending" | "revoked";
    comments?: string;
}>;
export declare const genericFoundationSchema: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    org_id: z.ZodOptional<z.ZodString>;
    bu_id: z.ZodOptional<z.ZodString>;
    head_user_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delegatorId: z.ZodOptional<z.ZodString>;
    delegateId: z.ZodOptional<z.ZodString>;
    delegationType: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolution: z.ZodOptional<z.ZodString>;
    fromStatus: z.ZodOptional<z.ZodString>;
    toStatus: z.ZodOptional<z.ZodString>;
    reviewStatus: z.ZodOptional<z.ZodString>;
    comments: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    ownerUserId: z.ZodOptional<z.ZodString>;
    ownerRole: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    org_id: z.ZodOptional<z.ZodString>;
    bu_id: z.ZodOptional<z.ZodString>;
    head_user_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delegatorId: z.ZodOptional<z.ZodString>;
    delegateId: z.ZodOptional<z.ZodString>;
    delegationType: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolution: z.ZodOptional<z.ZodString>;
    fromStatus: z.ZodOptional<z.ZodString>;
    toStatus: z.ZodOptional<z.ZodString>;
    reviewStatus: z.ZodOptional<z.ZodString>;
    comments: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    ownerUserId: z.ZodOptional<z.ZodString>;
    ownerRole: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    org_id: z.ZodOptional<z.ZodString>;
    bu_id: z.ZodOptional<z.ZodString>;
    head_user_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    delegatorId: z.ZodOptional<z.ZodString>;
    delegateId: z.ZodOptional<z.ZodString>;
    delegationType: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolution: z.ZodOptional<z.ZodString>;
    fromStatus: z.ZodOptional<z.ZodString>;
    toStatus: z.ZodOptional<z.ZodString>;
    reviewStatus: z.ZodOptional<z.ZodString>;
    comments: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    ownerUserId: z.ZodOptional<z.ZodString>;
    ownerRole: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
