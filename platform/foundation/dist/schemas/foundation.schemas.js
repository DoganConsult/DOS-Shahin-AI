"use strict";
/**
 * Foundation Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner foundation
 * @module foundation
 * @since 2026-03-31
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericFoundationSchema = exports.grantAccessReviewSchema = exports.assignOwnershipSchema = exports.createUserLifecycleSchema = exports.calculateSodCheckSchema = exports.delegationSchema = exports.updatePositionSchema = exports.createPositionSchema = exports.updateDepartmentSchema = exports.createDepartmentSchema = exports.updateBusinessUnitSchema = exports.createBusinessUnitSchema = exports.updateOrganizationSchema = exports.createOrganizationSchema = exports.createTransitionBody = exports.updateResolveBody = exports.createScanBody = exports.createDelegationsBody = exports.updateRevokeBody = exports.createFoundationBody = exports.updateFoundationBody = exports.createInitiateBody = exports.foundationListQuery = exports.foundationNodeUpdateBody = exports.foundationNodeCreateBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("./common.schemas");
// ── Domain Enums ─────────────────────────────────────────────────────
const foundationEntityType = zod_1.z.enum([
    'organization', 'business_unit', 'department', 'position', 'legal_entity',
]);
const foundationStatus = zod_1.z.enum([
    'draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived',
]);
// ── Body Schemas ─────────────────────────────────────────────────────
exports.foundationNodeCreateBody = zod_1.z.object({
    entityType: foundationEntityType,
    parentId: zod_1.z.string().uuid().optional().nullable(),
    nameEn: zod_1.z.string().min(1).max(255).trim(),
    nameAr: zod_1.z.string().max(255).trim().optional().nullable(),
    code: zod_1.z.string().min(1).max(100),
    ownerId: zod_1.z.string().uuid().optional().nullable(),
    metadata: common_schemas_1.grcJsonMetadata.optional(),
});
exports.foundationNodeUpdateBody = zod_1.z.object({
    nameEn: zod_1.z.string().min(1).max(255).trim().optional(),
    nameAr: zod_1.z.string().max(255).trim().optional().nullable(),
    code: zod_1.z.string().min(1).max(100).optional(),
    parentId: zod_1.z.string().uuid().optional().nullable(),
    ownerId: zod_1.z.string().uuid().optional().nullable(),
    status: foundationStatus.optional(),
    metadata: common_schemas_1.grcJsonMetadata.optional(),
});
// ── Query Schemas ────────────────────────────────────────────────────
exports.foundationListQuery = common_schemas_1.paginationQuery.extend({
    entityType: foundationEntityType.optional(),
    parentId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.string().optional(),
});
exports.createInitiateBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateFoundationBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createFoundationBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateRevokeBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createDelegationsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createScanBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateResolveBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createTransitionBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ── Organization Schemas ────────────────────────────────────────────
exports.createOrganizationSchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1, 'English name is required').max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    org_type: zod_1.z.enum(['corporate', 'government', 'ngo', 'academic', 'other']).optional(),
    country: zod_1.z.string().max(10).optional(),
    sector: zod_1.z.string().max(100).optional(),
    status: zod_1.z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateOrganizationSchema = exports.createOrganizationSchema.partial();
// ── Business Unit Schemas ──────────────────────────────────────────
exports.createBusinessUnitSchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1, 'English name is required').max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    org_id: zod_1.z.string().uuid('org_id must be a valid UUID'),
    code: zod_1.z.string().min(1).max(100).optional(),
    head_user_id: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateBusinessUnitSchema = exports.createBusinessUnitSchema.partial();
// ── Department Schemas ─────────────────────────────────────────────
exports.createDepartmentSchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1, 'English name is required').max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    bu_id: zod_1.z.string().uuid('bu_id must be a valid UUID'),
    code: zod_1.z.string().min(1).max(100).optional(),
    head_user_id: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateDepartmentSchema = exports.createDepartmentSchema.partial();
// ── Position Schema (alias) ────────────────────────────────────────
var positions_schemas_1 = require("./positions.schemas");
Object.defineProperty(exports, "createPositionSchema", { enumerable: true, get: function () { return positions_schemas_1.createPositionBody; } });
Object.defineProperty(exports, "updatePositionSchema", { enumerable: true, get: function () { return positions_schemas_1.updatePositionBody; } });
// ── Delegation Schema ──────────────────────────────────────────────
exports.delegationSchema = zod_1.z.object({
    delegatorId: zod_1.z.string().uuid('delegatorId must be a valid UUID'),
    delegateId: zod_1.z.string().uuid('delegateId must be a valid UUID'),
    delegationType: zod_1.z.enum(['authority', 'task', 'approval', 'review']).default('authority'),
    scope: zod_1.z.enum(['org', 'bu', 'dept', 'team', 'module']).default('org'),
    expiresAt: zod_1.z.string().datetime({ offset: true }).optional().nullable(),
    reason: zod_1.z.string().max(1000).optional().nullable(),
});
// ── SoD Check Schema ───────────────────────────────────────────────
exports.calculateSodCheckSchema = zod_1.z.object({
    resolution: zod_1.z.enum(['accepted', 'mitigated', 'reassigned', 'rejected']).optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
// ── User Lifecycle Schema ──────────────────────────────────────────
exports.createUserLifecycleSchema = zod_1.z.object({
    fromStatus: zod_1.z.string().min(1).max(50),
    toStatus: zod_1.z.string().min(1).max(50),
    reason: zod_1.z.string().max(1000).optional().nullable(),
});
// ── Ownership Mapping Schema ───────────────────────────────────────
exports.assignOwnershipSchema = zod_1.z.object({
    entityType: zod_1.z.string().min(1).max(100),
    entityId: zod_1.z.string().uuid(),
    ownerUserId: zod_1.z.string().uuid(),
    ownerRole: zod_1.z.string().max(100).default('owner'),
});
// ── Access Review Schema ───────────────────────────────────────────
exports.grantAccessReviewSchema = zod_1.z.object({
    reviewStatus: zod_1.z.enum(['approved', 'rejected', 'pending', 'revoked']),
    comments: zod_1.z.string().max(2000).optional(),
});
// ── Generic Foundation Schema (union for routes using shared validate) ──
exports.genericFoundationSchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255).optional(),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(100).optional(),
    org_id: zod_1.z.string().uuid().optional(),
    bu_id: zod_1.z.string().uuid().optional(),
    head_user_id: zod_1.z.string().uuid().optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    // delegation fields
    delegatorId: zod_1.z.string().uuid().optional(),
    delegateId: zod_1.z.string().uuid().optional(),
    delegationType: zod_1.z.string().max(50).optional(),
    scope: zod_1.z.string().max(50).optional(),
    expiresAt: zod_1.z.string().max(100).optional().nullable(),
    reason: zod_1.z.string().max(1000).optional().nullable(),
    // sod/lifecycle fields
    resolution: zod_1.z.string().max(100).optional(),
    fromStatus: zod_1.z.string().max(50).optional(),
    toStatus: zod_1.z.string().max(50).optional(),
    // access review fields
    reviewStatus: zod_1.z.string().max(50).optional(),
    comments: zod_1.z.string().max(2000).optional(),
    // ownership fields
    entityType: zod_1.z.string().max(100).optional(),
    entityId: zod_1.z.string().uuid().optional(),
    ownerUserId: zod_1.z.string().uuid().optional(),
    ownerRole: zod_1.z.string().max(100).optional(),
}).passthrough();
//# sourceMappingURL=foundation.schemas.js.map