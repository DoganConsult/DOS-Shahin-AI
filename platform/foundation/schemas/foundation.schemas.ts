/**
 * Foundation Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner foundation
 * @module foundation
 * @since 2026-03-31
 */

import { z } from 'zod';
import {
  paginationQuery,
  grcJsonMetadata,
  grcSortDir as _grcSortDir,
} from './common.schemas';

// ── Domain Enums ─────────────────────────────────────────────────────

const foundationEntityType = z.enum([
  'organization', 'business_unit', 'department', 'position', 'legal_entity',
]);

const foundationStatus = z.enum([
  'draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived',
]);

// ── Body Schemas ─────────────────────────────────────────────────────

export const foundationNodeCreateBody = z.object({
  entityType: foundationEntityType,
  parentId: z.string().uuid().optional().nullable(),
  nameEn: z.string().min(1).max(255).trim(),
  nameAr: z.string().max(255).trim().optional().nullable(),
  code: z.string().min(1).max(100),
  ownerId: z.string().uuid().optional().nullable(),
  metadata: grcJsonMetadata.optional(),
});

export const foundationNodeUpdateBody = z.object({
  nameEn: z.string().min(1).max(255).trim().optional(),
  nameAr: z.string().max(255).trim().optional().nullable(),
  code: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  status: foundationStatus.optional(),
  metadata: grcJsonMetadata.optional(),
});

// ── Query Schemas ────────────────────────────────────────────────────

export const foundationListQuery = paginationQuery.extend({
  entityType: foundationEntityType.optional(),
  parentId: z.string().uuid().optional(),
  status: z.string().optional(),
});

// ── Type Exports ─────────────────────────────────────────────────────

export type FoundationNodeCreate = z.infer<typeof foundationNodeCreateBody>;
export type FoundationNodeUpdate = z.infer<typeof foundationNodeUpdateBody>;
export type FoundationListQuery = z.infer<typeof foundationListQuery>;
export const createInitiateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateFoundationBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createFoundationBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateRevokeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createDelegationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createScanBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateResolveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTransitionBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});


// ── Organization Schemas ────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(255),
  name_ar: z.string().max(255).optional(),
  org_type: z.enum(['corporate', 'government', 'ngo', 'academic', 'other']).optional(),
  country: z.string().max(10).optional(),
  sector: z.string().max(100).optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// ── Business Unit Schemas ──────────────────────────────────────────

export const createBusinessUnitSchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(255),
  name_ar: z.string().max(255).optional(),
  org_id: z.string().uuid('org_id must be a valid UUID'),
  code: z.string().min(1).max(100).optional(),
  head_user_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBusinessUnitSchema = createBusinessUnitSchema.partial();

// ── Department Schemas ─────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(255),
  name_ar: z.string().max(255).optional(),
  bu_id: z.string().uuid('bu_id must be a valid UUID'),
  code: z.string().min(1).max(100).optional(),
  head_user_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ── Position Schema (alias) ────────────────────────────────────────

export { createPositionBody as createPositionSchema, updatePositionBody as updatePositionSchema } from './positions.schemas';

// ── Delegation Schema ──────────────────────────────────────────────

export const delegationSchema = z.object({
  delegatorId: z.string().uuid('delegatorId must be a valid UUID'),
  delegateId: z.string().uuid('delegateId must be a valid UUID'),
  delegationType: z.enum(['authority', 'task', 'approval', 'review']).default('authority'),
  scope: z.enum(['org', 'bu', 'dept', 'team', 'module']).default('org'),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
});

// ── SoD Check Schema ───────────────────────────────────────────────

export const calculateSodCheckSchema = z.object({
  resolution: z.enum(['accepted', 'mitigated', 'reassigned', 'rejected']).optional(),
  notes: z.string().max(2000).optional(),
});

// ── User Lifecycle Schema ──────────────────────────────────────────

export const createUserLifecycleSchema = z.object({
  fromStatus: z.string().min(1).max(50),
  toStatus: z.string().min(1).max(50),
  reason: z.string().max(1000).optional().nullable(),
});

// ── Ownership Mapping Schema ───────────────────────────────────────

export const assignOwnershipSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  ownerRole: z.string().max(100).default('owner'),
});

// ── Access Review Schema ───────────────────────────────────────────

export const grantAccessReviewSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected', 'pending', 'revoked']),
  comments: z.string().max(2000).optional(),
});

// ── Generic Foundation Schema (union for routes using shared validate) ──

export const genericFoundationSchema = z.object({
  name_en: z.string().min(1).max(255).optional(),
  name_ar: z.string().max(255).optional(),
  code: z.string().max(100).optional(),
  org_id: z.string().uuid().optional(),
  bu_id: z.string().uuid().optional(),
  head_user_id: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // delegation fields
  delegatorId: z.string().uuid().optional(),
  delegateId: z.string().uuid().optional(),
  delegationType: z.string().max(50).optional(),
  scope: z.string().max(50).optional(),
  expiresAt: z.string().max(100).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
  // sod/lifecycle fields
  resolution: z.string().max(100).optional(),
  fromStatus: z.string().max(50).optional(),
  toStatus: z.string().max(50).optional(),
  // access review fields
  reviewStatus: z.string().max(50).optional(),
  comments: z.string().max(2000).optional(),
  // ownership fields
  entityType: z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  ownerUserId: z.string().uuid().optional(),
  ownerRole: z.string().max(100).optional(),
}).passthrough();
